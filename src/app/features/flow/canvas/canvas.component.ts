import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faTrash, faGear, faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { GraphModel, GraphNode, Point, GraphEdge, ConditionNodeData } from '../graph.types';
import { GraphStateService } from '../graph-state.service';
import { NodeQuestionComponent } from '../node-question/node-question.component';
import { NodeConditionComponent } from '../node-condition/node-condition.component';

@Component({
  selector: 'app-canvas',
  standalone: true,
  styleUrl: './canvas.component.scss',
  imports: [
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase,
    DragDropModule, MatButtonModule, FontAwesomeModule, 
    NodeQuestionComponent, NodeConditionComponent
  ],
  templateUrl: './canvas.component.html'
})
export class CanvasComponent {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLDivElement>;

  library = inject(FaIconLibrary);

  // Font Awesome icons
  faEdit = faEdit;
  faTrash = faTrash;
  faGear = faGear;
  faCodeBranch = faCodeBranch;

  // pan/zoom do canvas
  offset = { x: 0, y: 0 };
  zoom = 1;
  private panning = false;
  private panStart = { x: 0, y: 0 };
  private panOffsetStart = { x: 0, y: 0 };
  selectedId;
  graph;

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

  constructor(private state: GraphStateService) {
    this.library.addIcons(faEdit, faTrash, faGear, faCodeBranch);
    /** Observa o grafo e o id selecionado do serviço (sem depender de getters opcionais) */
    this.graph = toSignal(this.state.graph$, { initialValue: { nodes: [], edges: [] } as GraphModel });
    this.selectedId = toSignal(this.state.selectedId$, { initialValue: null as string | null });

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
  private readonly ROUTE_GAP = 24;   // afastamento inicial/final do nó
  private readonly ROUTE_PAD = 16;   // margem ao redor dos nós para não encostar
  private readonly ROUTE_STEP = 20;  // passo de busca por corredores livres

  private getNodeBBox(n: GraphNode): { x1: number, y1: number, x2: number, y2: number } {
    const off = this.dragOffsets[n.id] || { x: 0, y: 0 };
    const { w, h } = this.nodeSize(n.kind);
    const x1 = n.position.x + off.x;
    const y1 = n.position.y + off.y;
    return { x1, y1, x2: x1 + w, y2: y1 + h };
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
    // Contorna ambos nós: sai pela direita do origem e entra pela esquerda do destino
    const fromCenterY = (fromRect.y1 + fromRect.y2) / 2;
    const toCenterY = (toRect.y1 + toRect.y2) / 2;
    const goBelow = toCenterY >= fromCenterY;
    const yPass = goBelow ? Math.max(fromRect.y2, toRect.y2) + this.ROUTE_PAD : Math.min(fromRect.y1, toRect.y1) - this.ROUTE_PAD;
    const xRightFrom = fromRect.x2 + this.ROUTE_PAD;    // totalmente fora do nó origem
    const xLeftTo = toRect.x1 - this.ROUTE_PAD;         // totalmente fora do nó destino
    return this.toPathString(this.verticalContourPoints(p1, p2, fromRect, toRect));
  }

  private horizontalContourPath(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}) {
    // Destino está à esquerda do origem: contornar ambos e entrar pela esquerda do destino
    const gap = this.ROUTE_GAP;
    const fromCenterY = (fromRect.y1 + fromRect.y2) / 2;
    const toCenterY = (toRect.y1 + toRect.y2) / 2;
    const goBelow = toCenterY >= fromCenterY;
    const yPass = goBelow ? Math.max(fromRect.y2, toRect.y2) + this.ROUTE_PAD : Math.min(fromRect.y1, toRect.y1) - this.ROUTE_PAD;
    const xA = p1.x + gap; // coluna fora do nó origem
    const xLeftDest = toRect.x1 - this.ROUTE_PAD; // coluna à esquerda do nó destino
    return this.toPathString(this.horizontalContourPoints(p1, p2, fromRect, toRect));
  }

  private verticalContourPoints(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}): Point[] {
    const fromCenterY = (fromRect.y1 + fromRect.y2) / 2;
    const toCenterY = (toRect.y1 + toRect.y2) / 2;
    const goBelow = toCenterY >= fromCenterY;
    const yPass = goBelow ? Math.max(fromRect.y2, toRect.y2) + this.ROUTE_PAD : Math.min(fromRect.y1, toRect.y1) - this.ROUTE_PAD;
    const xRightFrom = fromRect.x2 + this.ROUTE_PAD;
    const xLeftTo = toRect.x1 - this.ROUTE_PAD;
    return [
      { x: p1.x, y: p1.y },
      { x: xRightFrom, y: p1.y },
      { x: xRightFrom, y: yPass },
      { x: xLeftTo,    y: yPass },
      { x: xLeftTo,    y: p2.y },
      { x: p2.x,       y: p2.y }
    ];
  }

  private horizontalContourPoints(p1: Point, p2: Point, fromRect: {x1:number,y1:number,x2:number,y2:number}, toRect: {x1:number,y1:number,x2:number,y2:number}): Point[] {
    const fromCenterY = (fromRect.y1 + fromRect.y2) / 2;
    const toCenterY = (toRect.y1 + toRect.y2) / 2;
    const goBelow = toCenterY >= fromCenterY;
    const yPass = goBelow ? Math.max(fromRect.y2, toRect.y2) + this.ROUTE_PAD : Math.min(fromRect.y1, toRect.y1) - this.ROUTE_PAD;
    const xA = p1.x + this.ROUTE_GAP;
    const xLeftDest = toRect.x1 - this.ROUTE_PAD;
    return [
      { x: p1.x, y: p1.y },
      { x: xA,   y: p1.y },
      { x: xA,   y: yPass },
      { x: xLeftDest, y: yPass },
      { x: xLeftDest, y: p2.y },
      { x: p2.x, y: p2.y }
    ];
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
      points.push(
        { x: x1, y: y1 },
        { x: xAClear, y: y1 },
        { x: xAClear, y: yMid },
        { x: xBClear, y: yMid },
        { x: xBClear, y: y2 },
        { x: x2, y: y2 }
      );
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

    points.push(
      { x: x1, y: y1 },
      { x: xA2, y: y1 },
      { x: xC,  y: y1 },
      { x: xC,  y: y2 },
      { x: xB2, y: y2 },
      { x: x2,  y: y2 }
    );
    return this.toPathString(points);
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
  isSelected(id: string) { return this.selectedId() === id; }
  select(id: string)      { this.state.select(id); }
  deselect()              { this.state.closeSidebar(); }

  // drag do nó
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
  }

  // pan do canvas (arrastar o fundo)
  startPan(ev: MouseEvent) {
    // só inicia pan se clicou fora de um nó/handle e não estivermos conectando
    const hit = (ev.target as HTMLElement).closest('.node-wrapper');
    if (hit || this.connectingFrom) return;

    this.panning = true;
    this.panStart = { x: ev.clientX, y: ev.clientY };
    this.panOffsetStart = { ...this.offset };
  }
  onMove(ev: MouseEvent) {
    if (this.panning) {
      const dx = (ev.clientX - this.panStart.x) / this.zoom;
      const dy = (ev.clientY - this.panStart.y) / this.zoom;
      this.offset = { x: this.panOffsetStart.x + dx, y: this.panOffsetStart.y + dy };
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
      // Restringir: saídas do nó final só conectam a nós de ação
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

  onCanvasMouseUp() {
    this.endPan();
    if (this.connectingFrom) this.finishConnection(null);
  }

  removeEdge(id: string, ev: MouseEvent) {
    ev.stopPropagation();
    this.state.removeEdge(id);
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

