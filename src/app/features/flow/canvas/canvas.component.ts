import { Component, ElementRef, HostListener, OnDestroy, inject, ViewChild, effect } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faTrash, faCodeBranch, faClone } from '@fortawesome/free-solid-svg-icons';
import { GraphModel, GraphNode, Point, GraphEdge, ConditionNodeData } from '../graph.types';
import { GraphStateService } from '../graph-state.service';
import { NodeQuestionComponent } from '../node-question/node-question.component';
import { NodeConditionComponent } from '../node-condition/node-condition.component';
import { NodeActionComponent } from '../node-action/node-action.component';
import { NodeEndComponent } from '../node-end/node-end.component';
import { TranslationPipe, TranslationService } from '@angulartoolsdr/translation';

@Component({
  selector: 'app-canvas',
  standalone: true,
  styleUrl: './canvas.component.scss',
  imports: [
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase,
    DragDropModule, MatButtonModule, FontAwesomeModule, 
    NodeQuestionComponent, NodeConditionComponent, NodeActionComponent, NodeEndComponent, TranslationPipe
  ],
  templateUrl: './canvas.component.html'
})
export class CanvasComponent implements OnDestroy {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLDivElement>;

  library = inject(FaIconLibrary);
  private readonly translation = inject(TranslationService);

  // Font Awesome icons
  faEdit = faEdit;
  faTrash = faTrash;
  faCodeBranch = faCodeBranch;
  faClone = faClone;

  // pan/zoom do canvas
  offset = { x: 0, y: 0 };
  zoom = 1;
  spacePressed = false;
  panning = false;
  private panStart = { x: 0, y: 0 };
  private panOffsetStart = { x: 0, y: 0 };
  selectedId;
  selectedIds;
  graph;

  selectionBox: { x: number; y: number; width: number; height: number } | null = null;
  private marqueeStart: Point | null = null;
  marqueeActive = false;
  private previewSelection: Set<string> | null = null;
  draggingSelection = false;
  nodeDragging = false;
  private selectionDragStart: Point | null = null;
  private selectionRectStart: { x: number; y: number; width: number; height: number } | null = null;
  private selectionInitialNodePositions: Record<string, Point> = {};
  private selectionDragDelta: Point = { x: 0, y: 0 };
  private areaSelectionActive = false;
  private suppressClick = false;
  private readonly selectionPadding = 16;
  private readonly defaultEdgeStroke = 2;
  private readonly selectedEdgeStroke = 4;
  private readonly defaultEdgeColor = '#b9bed1';
  private readonly selectedEdgeColor = '#4f46e5';
  private readonly hoveredEdgeColor = '#ff4d4f';
  // dimensões do "mundo" para posicionamento e arestas
  readonly worldW = 2000;
  readonly worldH = 1200;

  // conexão entre nós
  connectingFrom: string | null = null;
  // id da condição de origem quando conectando a partir de um nó de condição
  connectingConditionId: string | null = null;
  tempConnection: Point = { x: 0, y: 0 };

  hoveredEdgeId: string | null = null;

  // posições temporárias enquanto arrasta
  private dragOffsets: Record<string, Point> = {};

  // Context menu state
  contextMenu = { visible: false, x: 0, y: 0, node: null as GraphNode | null };

  openContextMenu(node: GraphNode, ev: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.contextMenu = { visible: true, x: ev.clientX - rect.left, y: ev.clientY - rect.top, node };
  }
  closeContextMenu() { this.contextMenu.visible = false; this.contextMenu.node = null; }
  onContextAction(action: 'duplicate'|'edit'|'delete') {
    const node = this.contextMenu.node;
    this.closeContextMenu();
    if (!node) return;
    if (action === 'edit') { this.startEdit(node); return; }
    if (action === 'delete') { this.deleteNode(node.id); return; }
    if (action === 'duplicate') {
      const pos = { x: node.position.x + 24, y: node.position.y + 24 };
      const data: any = JSON.parse(JSON.stringify(node.data));
      if (node.kind === 'question') {
        data.id = `q_${crypto.randomUUID().slice(0,4)}`;
      }
      this.state.addNode(node.kind as any, data, pos);
    }
  }

  selectionTransform(id: string): string | null {
    if (!this.draggingSelection) return null;
    const off = this.dragOffsets[id];
    if (!off) return null;
    if (!off.x && !off.y) return null;
    return `translate(${off.x}px, ${off.y}px)`;
  }

  private bodySelectionStyles: { userSelect: string; webkitUserSelect: string; msUserSelect: string } | null = null;

  private setGlobalSelection(disabled: boolean) {
    if (typeof document === 'undefined') return;
    const style = document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string; msUserSelect?: string };
    if (disabled) {
      if (!this.bodySelectionStyles) {
        this.bodySelectionStyles = {
          userSelect: style.userSelect,
          webkitUserSelect: style.webkitUserSelect ?? '',
          msUserSelect: style.msUserSelect ?? ''
        };
      }
      style.userSelect = 'none';
      style.webkitUserSelect = 'none';
      style.msUserSelect = 'none';
    } else if (this.bodySelectionStyles) {
      style.userSelect = this.bodySelectionStyles.userSelect;
      style.webkitUserSelect = this.bodySelectionStyles.webkitUserSelect;
      style.msUserSelect = this.bodySelectionStyles.msUserSelect;
      this.bodySelectionStyles = null;
    }
  }

  private clearTextSelection() {
    try {
      const selection = window.getSelection?.();
      selection?.removeAllRanges?.();
    } catch {
      // ignore
    }
  }

  private worldPointFromEvent(ev: MouseEvent): Point {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left - this.offset.x * this.zoom) / this.zoom,
      y: (ev.clientY - rect.top - this.offset.y * this.zoom) / this.zoom
    };
  }

  private rectFromPoints(a: Point, b: Point) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
  }

  private rectsOverlap(selection: { x: number; y: number; width: number; height: number }, bbox: { x1: number; y1: number; x2: number; y2: number }) {
    const selX2 = selection.x + selection.width;
    const selY2 = selection.y + selection.height;
    return !(bbox.x2 < selection.x || bbox.x1 > selX2 || bbox.y2 < selection.y || bbox.y1 > selY2);
  }

  private nodesInRect(selection: { x: number; y: number; width: number; height: number }): string[] {
    if (!selection.width && !selection.height) return [];
    const ids: string[] = [];
    for (const node of this.graph().nodes) {
      const bbox = this.getNodeBBoxForSelection(node);
      if (this.rectsOverlap(selection, bbox)) {
        ids.push(node.id);
      }
    }
    return ids;
  }

  private computeSelectionBoxFromIds(ids: string[]): { x: number; y: number; width: number; height: number } | null {
    if (!ids.length) return null;
    let x1 = Number.POSITIVE_INFINITY;
    let y1 = Number.POSITIVE_INFINITY;
    let x2 = Number.NEGATIVE_INFINITY;
    let y2 = Number.NEGATIVE_INFINITY;
    for (const id of ids) {
      const node = this.graph().nodes.find(n => n.id === id);
      if (!node) continue;
      const bbox = this.getNodeBBoxForSelection(node);
      x1 = Math.min(x1, bbox.x1);
      y1 = Math.min(y1, bbox.y1);
      x2 = Math.max(x2, bbox.x2);
      y2 = Math.max(y2, bbox.y2);
    }
    const selectedSet = new Set(ids);
    for (const edge of this.graph().edges) {
      if (!selectedSet.has(edge.from) || !selectedSet.has(edge.to)) continue;
      const bounds = this.edgeBoundingBox(edge);
      if (!bounds) continue;
      x1 = Math.min(x1, bounds.x1);
      y1 = Math.min(y1, bounds.y1);
      x2 = Math.max(x2, bounds.x2);
      y2 = Math.max(y2, bounds.y2);
    }
    if (x1 === Number.POSITIVE_INFINITY) return null;
    const padding = this.selectionPadding;
    return { x: x1 - padding, y: y1 - padding, width: x2 - x1 + padding * 2, height: y2 - y1 + padding * 2 };
  }

  private clearAreaSelection() {
    this.selectionBox = null;
    this.areaSelectionActive = false;
    this.previewSelection = null;
  }

  private pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }) {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  private beginSelectionDrag(start: Point) {
    if (!this.selectionBox) return;
    this.suppressClick = true;
    this.draggingSelection = true;
    this.selectionDragStart = start;
    this.selectionRectStart = { ...this.selectionBox };
    this.selectionDragDelta = { x: 0, y: 0 };
    this.selectionInitialNodePositions = {};
    for (const id of this.selectedIds()) {
      const node = this.graph().nodes.find(n => n.id === id);
      if (!node) continue;
      this.selectionInitialNodePositions[id] = { ...node.position };
      this.dragOffsets[id] = { x: 0, y: 0 };
    }
  }

  private updateSelectionDrag(point: Point) {
    if (!this.draggingSelection || !this.selectionDragStart || !this.selectionRectStart) return;
    const dx = point.x - this.selectionDragStart.x;
    const dy = point.y - this.selectionDragStart.y;
    this.selectionDragDelta = { x: dx, y: dy };
    this.selectionBox = {
      x: this.selectionRectStart.x + dx,
      y: this.selectionRectStart.y + dy,
      width: this.selectionRectStart.width,
      height: this.selectionRectStart.height
    };
    for (const id of Object.keys(this.selectionInitialNodePositions)) {
      this.dragOffsets[id] = { x: dx, y: dy };
    }
  }

  private finalizeSelectionDrag() {
    if (!this.draggingSelection) return;
    const delta = this.selectionDragDelta;
    const moved = Object.entries(this.selectionInitialNodePositions);
    if (delta.x !== 0 || delta.y !== 0) {
      const moves = moved.map(([id, origin]) => ({ id, position: { x: origin.x + delta.x, y: origin.y + delta.y } }));
      this.state.moveNodes(moves);
    }
    for (const [id] of moved) {
      delete this.dragOffsets[id];
    }
    this.draggingSelection = false;
    this.selectionDragStart = null;
    this.selectionRectStart = null;
    this.selectionInitialNodePositions = {};
    this.selectionDragDelta = { x: 0, y: 0 };
    if (this.areaSelectionActive) {
      const ids = this.selectedIds();
      const rect = this.computeSelectionBoxFromIds(ids);
      if (rect) this.selectionBox = rect;
    }
  }

  private beginMarquee(start: Point) {
    this.suppressClick = true;
    this.marqueeActive = true;
    this.marqueeStart = start;
    this.selectionBox = { x: start.x, y: start.y, width: 0, height: 0 };
    this.previewSelection = new Set();
  }

  private updateMarquee(point: Point) {
    if (!this.marqueeActive || !this.marqueeStart) return;
    const rect = this.rectFromPoints(this.marqueeStart, point);
    this.selectionBox = rect;
    this.previewSelection = new Set(this.nodesInRect(rect));
  }

  private finalizeMarquee() {
    if (!this.marqueeActive) return;
    this.marqueeActive = false;
    const ids = this.previewSelection ? Array.from(this.previewSelection) : [];
    this.previewSelection = null;
    this.marqueeStart = null;
    if (!ids.length) {
      this.clearAreaSelection();
      this.state.clearSelection();
      return;
    }
    this.areaSelectionActive = true;
    const rect = this.computeSelectionBoxFromIds(ids);
    if (rect) {
      this.selectionBox = rect;
    }
    const primary = ids.length === 1 ? ids[0] : null;
    this.state.setSelection(ids, primary);
  }



  constructor(private state: GraphStateService) {
    this.library.addIcons(faEdit, faTrash, faCodeBranch, faClone);
    /** Observa o grafo e o id selecionado do serviço (sem depender de getters opcionais) */
    this.graph = toSignal(this.state.graph$, { initialValue: { nodes: [], edges: [] } as GraphModel });
    this.selectedId = toSignal(this.state.selectedId$, { initialValue: null as string | null });
    this.selectedIds = toSignal(this.state.selectedIds$, { initialValue: [] as string[] });

    effect(() => {
      const ids = this.selectedIds();
      if (!ids.length) {
        if (!this.marqueeActive && !this.draggingSelection) {
          this.selectionBox = null;
          this.areaSelectionActive = false;
          this.previewSelection = null;
        }
        return;
      }
      if (!this.areaSelectionActive || this.marqueeActive || this.draggingSelection) {
        return;
      }
      const rect = this.computeSelectionBoxFromIds(ids);
      if (rect) {
        this.selectionBox = rect;
      }
    });
  }

  private nodeSize(kind: string) {
    const cond = 120 * Math.SQRT2; // bounding box of rotated square (diamond)
    const w = kind === 'condition' ? cond : kind === 'action' ? 180 : kind === 'end' ? 150 : 200;
    const h = kind === 'condition' ? cond : kind === 'action' ? 80 : kind === 'end' ? 50 : 90;
    return { w, h };
  }

  private outPoint(id: string): Point {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    const off = this.dragOffsets[id] || { x: 0, y: 0 };
    if (n.kind === 'condition') {
      // Se for um nó de condição, retornar o ponto central (para compatibilidade)
      const s = 120;
      const margin = (s * Math.SQRT2 - s) / 2;
      const center = (s * Math.SQRT2) / 2;
      return { x: n.position.x + off.x + s + margin, y: n.position.y + off.y + center };
    }
    const { w, h } = this.nodeSize(n.kind);
    return { x: n.position.x + off.x + w, y: n.position.y + off.y + h / 2 };
  }

  conditionHandleTop(total: number, index: number): number {
    const spacing = 30;
    const center = this.nodeSize('condition').h / 2;
    return center + (index - (total - 1) / 2) * spacing;
  }

  endConditionHandleTop(total: number, index: number): number {
    const spacing = 30;
    const center = this.nodeSize('end').h / 2;
    return center + (index - (total - 1) / 2) * spacing;
  }

  // Método para calcular pontos de saída para cada condição específica
  private conditionOutPoint(nodeId: string, conditionIndex: number, total?: number): Point {
    const n = this.graph().nodes.find(nn => nn.id === nodeId);
    if (!n || n.kind !== 'condition') return { x: 0, y: 0 };

    const off = this.dragOffsets[nodeId] || { x: 0, y: 0 };

    const { w, h } = this.nodeSize('condition');
    const totalHandles = total ?? (n.data as ConditionNodeData).conditions.length;
    const spacing = 30;
    const center = h / 2;
    const x = n.position.x + off.x + w + 6; // 6 = raio do handle
    const y = n.position.y + off.y + center + (conditionIndex - (totalHandles - 1) / 2) * spacing + 6;

    return { x, y };
  }

  // Ponto de saída para cada condição do nó final
  private endOutPoint(nodeId: string, conditionIndex: number, total?: number): Point {
    const n = this.graph().nodes.find(nn => nn.id === nodeId);
    if (!n || n.kind !== 'end') return { x: 0, y: 0 };

    const off = this.dragOffsets[nodeId] || { x: 0, y: 0 };
    const { w, h } = this.nodeSize('end');
    const totalHandles = total ?? ((n.data as any).conditions?.length || 0);
    const spacing = 30;
    const center = h / 2;
    const x = n.position.x + off.x + w + 6;
    const y = n.position.y + off.y + center + (conditionIndex - (totalHandles - 1) / 2) * spacing + 6;
    return { x, y };
  }

  defaultConditionLabel(index: number): string {
    return `${this.translation.instant('CONDITION')} ${index + 1}`;
  }

  defaultAllConditionsLabel(): string {
    return this.translation.instant('CONDITION_ALL');
  }

  private isAllConditionsEdge(edge: GraphEdge): boolean {
    const fromNode = this.graph().nodes.find(n => n.id === edge.from);
    const toNode = this.graph().nodes.find(n => n.id === edge.to);
    return !!fromNode && !!toNode && fromNode.kind === 'condition' && toNode.kind === 'condition' && !edge.conditionId;
  }

  hasAllConditionsEdge(nodeId: string): boolean {
    return this.graph().edges.some(e => e.from === nodeId && this.isAllConditionsEdge(e));
  }

  totalConditionHandles(nodeId: string): number {
    const n = this.graph().nodes.find(nn => nn.id === nodeId);
    if (!n || n.kind !== 'condition') return 0;
    const base = (n.data as ConditionNodeData).conditions.length;
    return base + (this.hasAllConditionsEdge(nodeId) ? 1 : 0);
  }

  // Método para obter o ponto de saída correto com base na edge
  private getOutPointForEdge(edge: GraphEdge): Point {
    const fromNode = this.graph().nodes.find(n => n.id === edge.from);
    if (!fromNode || (fromNode.kind !== 'condition' && fromNode.kind !== 'end')) {
      return this.outPoint(edge.from);
    }

    const conditions = (fromNode.kind === 'condition'
      ? (fromNode.data as ConditionNodeData).conditions || []
      : ((fromNode.data as any).conditions || []));
    const total = fromNode.kind === 'condition' ? this.totalConditionHandles(edge.from) : conditions.length;

    if (edge.conditionId) {
      const conditionIndex = conditions.findIndex((c: any) => c.id === edge.conditionId);
      if (conditionIndex === -1) return this.outPoint(edge.from);
      return fromNode.kind === 'condition'
        ? this.conditionOutPoint(edge.from, conditionIndex, total)
        : this.endOutPoint(edge.from, conditionIndex, total);
    }

    if (fromNode.kind === 'condition' && this.isAllConditionsEdge(edge)) {
      return this.conditionOutPoint(edge.from, conditions.length, total);
    }

    return this.outPoint(edge.from);
  }
  
  private inPoint(id: string): Point {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    const off = this.dragOffsets[id] || { x: 0, y: 0 };
    if (n.kind === 'condition') {
      const s = 120;
      const margin = (s * Math.SQRT2 - s) / 2;
      const center = (s * Math.SQRT2) / 2;
      return { x: n.position.x + off.x + margin, y: n.position.y + off.y + center };
    }
    const { h } = this.nodeSize(n.kind);
    return { x: n.position.x + off.x, y: n.position.y + off.y + h / 2 };
  }

  // Roteamento ortogonal com desvio dos nós (estilo n8n)
  private readonly ROUTE_GAP = 36;   // afastamento inicial/final do nó
  private readonly ROUTE_PAD = 24;   // margem ao redor dos nós para não encostar
  private readonly ROUTE_STEP = 20;  // passo de busca por corredores livres
  private readonly VERTICAL_STACK_MARGIN = 72; // margem lateral extra para arestas verticais
  private readonly EDGE_NODE_MARGIN = 18;      // folga mínima entre o nó e o caminho horizontal
  private readonly ROUTE_CORNER_RADIUS = 12;

  private getNodeBBox(n: GraphNode): { x1: number, y1: number, x2: number, y2: number } {
    const off = this.dragOffsets[n.id] || { x: 0, y: 0 };
    const { w, h } = this.nodeSize(n.kind);
    const x1 = n.position.x + off.x;
    const y1 = n.position.y + off.y;
    return { x1, y1, x2: x1 + w, y2: y1 + h };
  }

  // Close context menu when clicking anywhere outside it
  @HostListener('document:click', ['$event'])
  onDocumentClickForMenu(ev: MouseEvent) {
    if (!this.contextMenu.visible) return;
    const target = ev.target as HTMLElement | null;
    if (!target) { this.closeContextMenu(); return; }
    const menuEl = document.querySelector('.context-menu') as HTMLElement | null;
    if (menuEl && menuEl.contains(target)) return;
    this.closeContextMenu();
  }

  // Inclui pequenas extensões visuais (ex.: handle de saída) para o cálculo da área selecionada
  private getNodeBBoxForSelection(n: GraphNode): { x1: number, y1: number, x2: number, y2: number } {
    const base = this.getNodeBBox(n);
    let extraRight = 0;
    // Para nós que exibem o handle de saída à direita, adiciona metade do diâmetro do handle (~7-8px)
    // Aplique para todos não-condição, exceto nó final com condições (que usa handles próprios)
    if (n.kind !== 'condition') {
      const hasEndConditions = n.kind === 'end' && !!(n as any).data?.conditions?.length;
      if (!hasEndConditions) extraRight = 12; // cobre handle (14px) com folga
    }
    return { x1: base.x1, y1: base.y1, x2: base.x2 + extraRight, y2: base.y2 };
  }

  private expanded(rect: { x1: number, y1: number, x2: number, y2: number }, pad = this.ROUTE_PAD) {
    return { x1: rect.x1 - pad, y1: rect.y1 - pad, x2: rect.x2 + pad, y2: rect.y2 + pad };
  }

  private rects(excludeIds: string[] = []) {
    const set = new Set(excludeIds);
    return this.graph().nodes
      .filter(n => !set.has(n.id))
      .map(n => this.expanded(this.getNodeBBox(n)));
  }

  private intersectsHorizontal(y: number, x1: number, x2: number, rect: { x1: number, y1: number, x2: number, y2: number }) {
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y < rect.y1 || y > rect.y2) return false;
    return !(x2 < rect.x1 || x1 > rect.x2);
  }

  private intersectsVertical(x: number, y1: number, y2: number, rect: { x1: number, y1: number, x2: number, y2: number }) {
    if (y1 > y2) [y1, y2] = [y2, y1];
    if (x < rect.x1 || x > rect.x2) return false;
    return !(y2 < rect.y1 || y1 > rect.y2);
  }

  private horizontalClear(y: number, x1: number, x2: number, rects: Array<{x1:number,y1:number,x2:number,y2:number}>) {
    return !rects.some(r => this.intersectsHorizontal(y, x1, x2, r));
  }

  private verticalClear(x: number, y1: number, y2: number, rects: Array<{x1:number,y1:number,x2:number,y2:number}>) {
    return !rects.some(r => this.intersectsVertical(x, y1, y2, r));
  }

  private findClearY(base: number, xA: number, xB: number, rects: Array<{x1:number,y1:number,x2:number,y2:number}>) {
    // Tenta em y base, depois busca acima/abaixo em passos
    const tryYs = [base];
    for (let step = this.ROUTE_STEP; step < 600; step += this.ROUTE_STEP) {
      tryYs.push(base - step, base + step);
    }
    for (const y of tryYs) {
      if (this.horizontalClear(y, xA, xB, rects)) return y;
    }
    return base; // fallback
  }

  private findClearX(base: number, y1: number, y2: number, direction: 1 | -1, rects: Array<{x1:number,y1:number,x2:number,y2:number}>) {
    // Busca para direita (1) ou esquerda (-1) a partir de base
    if (this.verticalClear(base, y1, y2, rects)) return base;
    let x = base;
    for (let step = this.ROUTE_STEP; step < 800; step += this.ROUTE_STEP) {
      const cand = base + direction * step;
      if (this.verticalClear(cand, y1, y2, rects)) return cand;
      // também tenta no sentido oposto para robustez
      const candOpp = base - direction * step;
      if (this.verticalClear(candOpp, y1, y2, rects)) return candOpp;
      x = cand;
    }
    return x; // fallback
  }

  private toPathString(points: Point[]) {
    if (!points.length) return '';
    const cmds = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length; i++) cmds.push(`L ${points[i].x} ${points[i].y}`);
    return cmds.join(' ');
  }

  private cubicPath(p1: Point, p2: Point) {
    const mx = (p1.x + p2.x) / 2;
    return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  private verticalContourPath(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}) {
    return this.roundedPolylinePath(this.verticalContourPoints(p1, p2, fromRect, toRect));
  }

  private horizontalContourPath(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}) {
    // Destino está à esquerda do origem: contornar ambos e entrar pela esquerda do destino
    return this.roundedPolylinePath(this.horizontalContourPoints(p1, p2, fromRect, toRect));
  }

  private detachTowards(point: Point, targetX: number): Point | null {
    const distance = Math.abs(targetX - point.x);
    if (distance < 4) return null;
    const clearance = Math.min(this.EDGE_NODE_MARGIN, distance - 2);
    if (clearance <= 0) return null;
    const dir = targetX >= point.x ? 1 : -1;
    return { x: point.x + dir * clearance, y: point.y };
  }

  private verticalLanePoints(p1: Point, p2: Point, laneX: number): Point[] {
    const points: Point[] = [{ x: p1.x, y: p1.y }];
    const startDetach = this.detachTowards(p1, laneX);
    if (startDetach) points.push(startDetach);
    points.push(
      { x: laneX, y: p1.y },
      { x: laneX, y: p2.y }
    );
    const endDetach = this.detachTowards(p2, laneX);
    if (endDetach) points.push(endDetach);
    points.push({ x: p2.x, y: p2.y });
    return points;
  }

  private verticalContourPoints(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}): Point[] {
    const rightmost = Math.max(fromRect.x2, toRect.x2);
    const leftmost = Math.min(fromRect.x1, toRect.x1);
    const laneRight = rightmost + this.VERTICAL_STACK_MARGIN;
    const laneLeft = leftmost - this.VERTICAL_STACK_MARGIN;
    const roomRight = this.worldW - rightmost;
    const roomLeft = leftmost;
    const useRightLane = roomRight >= Math.abs(roomLeft);
    const laneX = useRightLane ? laneRight : laneLeft;
    const destBelow = p2.y >= p1.y;
    const destTop = Math.min(toRect.y1, toRect.y2);
    const destBottom = Math.max(toRect.y1, toRect.y2);
    const shelfCandidate = destBelow
      ? Math.min(destTop - this.ROUTE_PAD, p2.y - this.EDGE_NODE_MARGIN)
      : Math.max(destBottom + this.ROUTE_PAD, p2.y + this.EDGE_NODE_MARGIN);
    const hasShelf = destBelow
      ? shelfCandidate > p1.y + this.ROUTE_PAD
      : shelfCandidate < p1.y - this.ROUTE_PAD;
    if (!hasShelf) {
      return this.verticalLanePoints(p1, p2, laneX);
    }
    const shelfY = shelfCandidate;
    const points: Point[] = [{ x: p1.x, y: p1.y }];
    const startDetach = this.detachTowards(p1, laneX);
    if (startDetach) points.push(startDetach);
    points.push(
      { x: laneX, y: p1.y },
      { x: laneX, y: shelfY },
      { x: p2.x, y: shelfY },
      { x: p2.x, y: p2.y }
    );
    return points;
  }

  private horizontalContourPoints(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}): Point[] {
    const fromCenterY = (fromRect.y1 + fromRect.y2) / 2;
    const toCenterY = (toRect.y1 + toRect.y2) / 2;
    const goBelow = toCenterY >= fromCenterY;
    const yPass = goBelow ? Math.max(fromRect.y2, toRect.y2) + this.ROUTE_PAD : Math.min(fromRect.y1, toRect.y1) - this.ROUTE_PAD;
    const xA = p1.x + this.ROUTE_GAP;
    const xLeftDest = toRect.x1 - this.ROUTE_PAD;
    const points: Point[] = [{ x: p1.x, y: p1.y }];
    const startDetach = this.detachTowards(p1, xA);
    if (startDetach) points.push(startDetach);
    points.push(
      { x: xA,   y: p1.y },
      { x: xA,   y: yPass },
      { x: xLeftDest, y: yPass },
      { x: xLeftDest, y: p2.y }
    );
    const endDetach = this.detachTowards(p2, xLeftDest);
    if (endDetach) points.push(endDetach);
    points.push({ x: p2.x, y: p2.y });
    return points;
  }

  private roundedPolylinePath(points: Point[]): string {
    if (!points.length) return '';
    if (points.length < 3) {
      return this.toPathString(points);
    }
    const radius = this.ROUTE_CORNER_RADIUS;
    const commands: string[] = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      const inVec = { x: curr.x - prev.x, y: curr.y - prev.y };
      const outVec = { x: next.x - curr.x, y: next.y - curr.y };
      const inLen = Math.hypot(inVec.x, inVec.y);
      const outLen = Math.hypot(outVec.x, outVec.y);
      if (!inLen || !outLen) {
        commands.push(`L ${curr.x} ${curr.y}`);
        continue;
      }
      const r = Math.min(radius, inLen / 2, outLen / 2);
      const entry = { x: curr.x - (inVec.x / inLen) * r, y: curr.y - (inVec.y / inLen) * r };
      const exit = { x: curr.x + (outVec.x / outLen) * r, y: curr.y + (outVec.y / outLen) * r };
      commands.push(`L ${entry.x} ${entry.y}`);
      commands.push(`Q ${curr.x} ${curr.y} ${exit.x} ${exit.y}`);
    }
    const last = points[points.length - 1];
    commands.push(`L ${last.x} ${last.y}`);
    return commands.join(' ');
  }

  private boundsFromPoints(points: Point[]): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!points.length) return null;
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    for (let i = 1; i < points.length; i++) {
      const { x, y } = points[i];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }

  private cubicBounds(p1: Point, p2: Point): { x1: number; y1: number; x2: number; y2: number } {
    const mx = (p1.x + p2.x) / 2;
    const xs = [p1.x, mx, p2.x];
    const ys = [p1.y, p2.y];
    const x1 = Math.min(...xs);
    const y1 = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);
    return { x1, y1, x2, y2 };
  }

  private edgeBoundingBox(edge: GraphEdge): { x1: number; y1: number; x2: number; y2: number } | null {
    const fromNode = this.graph().nodes.find(n => n.id === edge.from);
    const toNode = this.graph().nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const out = this.getOutPointForEdge(edge);
    const to = this.inPoint(edge.to);
    const fromR = this.expanded(this.getNodeBBox(fromNode));
    const toR = this.expanded(this.getNodeBBox(toNode));
    const overlapX = !(fromR.x2 < toR.x1 || toR.x2 < fromR.x1);
    const approxVertical = Math.abs(out.x - to.x) < 80;

    if (overlapX || approxVertical) {
      const points = this.verticalContourPoints(out, to, fromR, toR);
      const bounds = this.boundsFromPoints(points);
      if (bounds) return bounds;
    }

    if (to.x < out.x) {
      const points = this.horizontalContourPoints(out, to, fromR, toR);
      const bounds = this.boundsFromPoints(points);
      if (bounds) return bounds;
    }

    return this.cubicBounds(out, to);
  }
  private route(p1: Point, p2: Point, excludeIds: string[] = []) {
    // Roteamento ortogonal com até 5-6 segmentos, evitando retângulos (nós) com margem
    const rs = this.rects(excludeIds);
    const gap = this.ROUTE_GAP;
    const points: Point[] = [];

    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;

    // Caso simples: alvo à direita do origem
    if (x2 >= x1 + gap * 2) {
      const xA = x1 + gap;
      const xB = x2 - gap;
      // Encontrar um Y claro para o segmento horizontal longo
      const yMid = this.findClearY(y1, Math.min(xA, xB), Math.max(xA, xB), rs);
      // Garantir verticais claras em xA e xB
      const xAClear = this.findClearX(xA, y1, yMid, 1, rs);
      const xBClear = this.findClearX(xB, yMid, y2, -1, rs);
      points.push({ x: x1, y: y1 });
      const startDetach = this.detachTowards({ x: x1, y: y1 }, xAClear);
      if (startDetach) points.push(startDetach);
      points.push(
        { x: xAClear, y: y1 },
        { x: xAClear, y: yMid },
        { x: xBClear, y: yMid },
        { x: xBClear, y: y2 }
      );
      const endDetach = this.detachTowards({ x: x2, y: y2 }, xBClear);
      if (endDetach) points.push(endDetach);
      points.push({ x: x2, y: y2 });
      return this.toPathString(points);
    }

    // Caso alvo à esquerda: desvia por uma coluna lateral (direita preferencial)
    const goRight = true;
    const spanY1 = Math.min(y1, y2);
    const spanY2 = Math.max(y1, y2);
    let xC = Math.max(x1, x2) + gap; // coluna de desvio
    xC = this.findClearX(xC, spanY1, spanY2, 1, rs);

    // Se ainda assim estiver congestionado muito à direita, tente à esquerda
    if (!this.verticalClear(xC, spanY1, spanY2, rs)) {
      xC = Math.min(x1, x2) - gap;
      xC = this.findClearX(xC, spanY1, spanY2, -1, rs);
    }

    const xA2 = Math.min(x1 + gap, xC);
    const xB2 = Math.max(x2 - gap, xC);

    points.push({ x: x1, y: y1 });
    const startDetach = this.detachTowards({ x: x1, y: y1 }, xA2);
    if (startDetach) points.push(startDetach);
    points.push(
      { x: xA2, y: y1 },
      { x: xC,  y: y1 },
      { x: xC,  y: y2 },
      { x: xB2, y: y2 }
    );
    const endDetach = this.detachTowards({ x: x2, y: y2 }, xB2);
    if (endDetach) points.push(endDetach);
    points.push({ x: x2, y: y2 });
    return this.roundedPolylinePath(points);
  }

  pathBetween(edge: GraphEdge) {
    const out = this.getOutPointForEdge(edge);
    const to = this.inPoint(edge.to);

    // Decisão: se caixas se sobrepõem no eixo X, tratar como ligação vertical e contornar ambos nós.
    const fromNode = this.graph().nodes.find(n => n.id === edge.from)!;
    const toNode = this.graph().nodes.find(n => n.id === edge.to)!;
    const fromR = this.expanded(this.getNodeBBox(fromNode));
    const toR = this.expanded(this.getNodeBBox(toNode));
    const overlapX = !(fromR.x2 < toR.x1 || toR.x2 < fromR.x1);
    const approxVertical = Math.abs(out.x - to.x) < 80; // tolerância para alinhamento quase vertical

    if (overlapX || approxVertical) {
      return this.verticalContourPath(out, to, fromR, toR);
    }

    // Se destino está à esquerda do origem no eixo X, contornar pela direita
    if (to.x < out.x) {
      return this.horizontalContourPath(out, to, fromR, toR);
    }

    // Caso contrário, manter curva Bezier (comportamento flexível original)
    return this.cubicPath(out, to);
  }

  pathToPoint(fromId: string, to: Point) {
    const fromNode = this.graph().nodes.find(n => n.id === fromId);

    // Se estamos conectando a partir de um nó de condição, usar o handle correto
    if (fromNode && fromNode.kind === 'condition' && this.connectingConditionId) {
      const conditions = (fromNode.data as ConditionNodeData).conditions || [];
      const index = conditions.findIndex(c => c.id === this.connectingConditionId);
      const outPoint = index !== -1 ? this.conditionOutPoint(fromId, index, this.totalConditionHandles(fromId)) : this.outPoint(fromId);
      return this.cubicPath(outPoint, to);
    }
    
    // Saída específica de condição do nó final (por score)
    if (fromNode && fromNode.kind === 'end' && this.connectingConditionId) {
      const conditions = ((fromNode.data as any).conditions || []);
      const index = conditions.findIndex((c: any) => c.id === this.connectingConditionId);
      const outPoint = index !== -1 ? this.endOutPoint(fromId, index, conditions.length) : this.outPoint(fromId);
      return this.cubicPath(outPoint, to);
    }

    return this.cubicPath(this.outPoint(fromId), to);
  }

  // seleção
  isSelected(id: string) {
    if (this.marqueeActive) {
      return this.previewSelection?.has(id) ?? false;
    }
    if (this.previewSelection?.has(id)) return true;
    return this.selectedIds().includes(id);
  }
  select(id: string) {
    this.clearAreaSelection();
    this.marqueeActive = false;
    this.draggingSelection = false;
    this.state.select(id);
  }
  deselect() {
    this.clearAreaSelection();
    this.marqueeActive = false;
    this.draggingSelection = false;
    this.state.closeSidebar();
  }

  // drag do nó
  dragStart(_: CdkDragStart) {
    this.nodeDragging = true;
    this.clearTextSelection();
    this.setGlobalSelection(true);
  }

  dragMove(n: GraphNode, ev: CdkDragMove) {
    this.dragOffsets[n.id] = ev.source.getFreeDragPosition();
  }

  dragEnd(n: GraphNode, ev: CdkDragEnd) {
    const delta = ev.source.getFreeDragPosition();
    this.state.moveNode(n.id, {
      x: n.position.x + delta.x,
      y: n.position.y + delta.y
    });
    ev.source.reset();
    delete this.dragOffsets[n.id];
    this.nodeDragging = false;
    this.clearTextSelection();
    this.setGlobalSelection(false);
  }

  // pan do canvas (arrastar o fundo)
  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
      return;
    }

    // Ctrl+Z / Cmd+Z: undo last action
    if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      this.state.undo();
      return;
    }

    // Space: enable pan mode
    if (event.code === 'Space') {
      event.preventDefault();
      if (!this.spacePressed) {
        this.spacePressed = true;
      }
      return;
    }

    // Delete/Backspace: remove selected node(s)
    if (event.key === 'Delete' || event.code === 'Delete' || event.key === 'Del' || event.key === 'Backspace') {
      const ids = this.selectedIds();
      if (!ids.length) return;
      event.preventDefault();
      this.state.removeNodes(ids);
      // Clear any selection UI remnants
      this.clearAreaSelection();
      return;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onWindowKeyUp(event: KeyboardEvent) {
    if (event.code !== 'Space') return;
    event.preventDefault();
    this.spacePressed = false;
    if (this.panning) {
      this.endPan();
    }
  }

  @HostListener('window:blur')
  onWindowBlur() {
    this.spacePressed = false;
    if (this.panning) {
      this.endPan();
    }
  }

  startPan(ev: MouseEvent) {
    if (this.connectingFrom) return;
    const isLeftButton = ev.button === 0;

    if (this.spacePressed && isLeftButton) {
      ev.preventDefault();
      ev.stopPropagation();
      this.suppressClick = true;
      this.panning = true;
      this.panStart = { x: ev.clientX, y: ev.clientY };
      this.panOffsetStart = { ...this.offset };
      return;
    }

    if (!isLeftButton) return;

    const target = ev.target as HTMLElement;
    const insideSelectionBox = !!target.closest('.selection-box');

    if (!insideSelectionBox && target.closest('.node-wrapper')) {
      return;
    }

    const worldPoint = this.worldPointFromEvent(ev);

    if (this.selectionBox && this.areaSelectionActive && this.pointInRect(worldPoint, this.selectionBox)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.beginSelectionDrag(worldPoint);
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();
    this.clearAreaSelection();
    this.beginMarquee(worldPoint);
  }
  onMove(ev: MouseEvent) {
    if (this.panning) {
      const dx = (ev.clientX - this.panStart.x) / this.zoom;
      const dy = (ev.clientY - this.panStart.y) / this.zoom;
      this.offset = { x: this.panOffsetStart.x + dx, y: this.panOffsetStart.y + dy };
      return;
    }

    if (this.draggingSelection) {
      ev.preventDefault();
      this.updateSelectionDrag(this.worldPointFromEvent(ev));
    } else if (this.marqueeActive) {
      ev.preventDefault();
      this.updateMarquee(this.worldPointFromEvent(ev));
    }

    if (this.connectingFrom) {
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.tempConnection = {
        x: (ev.clientX - rect.left - this.offset.x * this.zoom) / this.zoom,
        y: (ev.clientY - rect.top - this.offset.y * this.zoom) / this.zoom
      };
    }
  }
  endPan() { this.panning = false; }

  startConnection(fromId: string, ev: MouseEvent, conditionId?: string) {
    ev.stopPropagation();
    ev.preventDefault();
    this.connectingFrom = fromId;
    this.connectingConditionId = conditionId || null;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.tempConnection = {
      x: (ev.clientX - rect.left - this.offset.x * this.zoom) / this.zoom,
      y: (ev.clientY - rect.top - this.offset.y * this.zoom) / this.zoom
    };
  }

  finishConnection(toId: string | null, ev?: MouseEvent) {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (this.connectingFrom && toId && this.connectingFrom !== toId) {
      const fromNode = this.graph().nodes.find(n => n.id === this.connectingFrom);
      const toNode = this.graph().nodes.find(n => n.id === toId);
      let conditionId = this.connectingConditionId || undefined;
      if (fromNode?.kind === 'condition' && toNode?.kind === 'condition') {
        conditionId = undefined;
      }
      // Restringir: saidas do no final so conectam a nos de acao
      if (fromNode?.kind === 'end' && toNode?.kind !== 'action') {
        this.connectingFrom = null;
        this.connectingConditionId = null;
        return;
      }
      this.state.connect(this.connectingFrom, toId, undefined, conditionId);
    }
    this.connectingFrom = null;
    this.connectingConditionId = null;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    
    // Calculate zoom factor based on wheel delta
    const zoomIntensity = 0.1;
    const delta = event.deltaY > 0 ? -zoomIntensity : zoomIntensity;
    
    // Calculate new zoom level
    const newZoom = this.zoom * (1 + delta);
    
    // Clamp zoom level between 0.5 and 2
    this.zoom = Math.min(Math.max(0.5, newZoom), 2);
  }

  zoomIn()  { this.zoom = Math.min(2, this.zoom + 0.1); }
  zoomOut() { this.zoom = Math.max(0.5, this.zoom - 0.1); }

  onCanvasClick(ev: MouseEvent) {
    // Close context menu first
    if (this.contextMenu.visible) {
      this.closeContextMenu();
      // Do not also deselect on same click if menu was open
      return;
    }
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (this.connectingFrom) return;
    if (this.selectionBox && this.areaSelectionActive) {
      const point = this.worldPointFromEvent(ev);
      if (this.pointInRect(point, this.selectionBox)) {
        return;
      }
    }
    this.deselect();
  }

  onCanvasMouseUp() {
    if (this.panning) {
      this.endPan();
    }

    if (this.draggingSelection) {
      this.finalizeSelectionDrag();
    }

    if (this.marqueeActive) {
      this.finalizeMarquee();
    }

    if (this.connectingFrom) this.finishConnection(null);
  }

  removeEdge(id: string, ev: MouseEvent) {
    ev.stopPropagation();
    this.state.removeEdge(id);
  }

  private edgeHighlightsSelection(edge: GraphEdge) {
    return this.isSelected(edge.from) && this.isSelected(edge.to);
  }

  edgeStrokeWidth(edge: GraphEdge) {
    return this.edgeHighlightsSelection(edge) ? this.selectedEdgeStroke : this.defaultEdgeStroke;
  }

  edgeStrokeColor(edge: GraphEdge) {
    if (this.hoveredEdgeId === edge.id) return this.hoveredEdgeColor;
    return this.edgeHighlightsSelection(edge) ? this.selectedEdgeColor : this.defaultEdgeColor;
  }

  edgeMidpoint(e: GraphEdge): Point {
    const p1 = this.getOutPointForEdge(e);
    const p2 = this.inPoint(e.to);

    const fromNode = this.graph().nodes.find(n => n.id === e.from)!;
    const toNode = this.graph().nodes.find(n => n.id === e.to)!;
    const fromR = this.expanded(this.getNodeBBox(fromNode));
    const toR = this.expanded(this.getNodeBBox(toNode));
    const overlapX = !(fromR.x2 < toR.x1 || toR.x2 < fromR.x1);
    const approxVertical = Math.abs(p1.x - p2.x) < 80;

    let pts: Point[] | null = null;
    if (overlapX || approxVertical) {
      pts = this.verticalContourPoints(p1, p2, fromR, toR);
    } else if (p2.x < p1.x) {
      pts = this.horizontalContourPoints(p1, p2, fromR, toR);
    }

    if (pts && pts.length >= 2) {
      // encontrar ponto no meio do comprimento total
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i+1].x - pts[i].x;
        const dy = pts[i+1].y - pts[i].y;
        total += Math.hypot(dx, dy);
      }
      const half = total / 2;
      let acc = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i+1];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        if (acc + seg >= half) {
          const t = (half - acc) / seg;
          return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        }
        acc += seg;
      }
      return pts[Math.floor(pts.length / 2)];
    }

    // fallback: meio entre pontos de saída/entrada (Bezier)
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  startEdit(node: GraphNode) {
    this.state.openSidebar(node.id);
  }

  deleteNode(id: string) {
    this.state.removeNode(id);
  }

  ngOnDestroy(): void {
    this.setGlobalSelection(false);
  }

  get viewBox() {
    const cw = this.canvasRef?.nativeElement.clientWidth || 1;
    const ch = this.canvasRef?.nativeElement.clientHeight || 1;
    return {
      width: 120 * (cw / (this.worldW * this.zoom)),
      height: 80 * (ch / (this.worldH * this.zoom)),
      left: -this.offset.x / (this.worldW * this.zoom) * 120,
      top: -this.offset.y / (this.worldH * this.zoom) * 80
    };
  }
}






















