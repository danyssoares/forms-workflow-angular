import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { DragDropModule, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
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
    /** Observa o grafo e o id selecionado do serviço (sem depender de getters opcionais) */
    this.graph = toSignal(this.state.graph$, { initialValue: { nodes: [], edges: [] } as GraphModel });
    this.selectedId = toSignal(this.state.selectedId$, { initialValue: null as string | null });

  }


  private nodeSize(kind: string) {
    const cond = 120 * Math.SQRT2; // bounding box of rotated square (diamond)
    const w = kind === 'condition' ? cond : kind === 'action' ? 180 : kind === 'end' ? 80 : 200;
    const h = kind === 'condition' ? cond : kind === 'action' ? 80 : kind === 'end' ? 80 : 90;
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
  
  // Método para calcular pontos de saída para cada condição específica
  private conditionOutPoint(nodeId: string, conditionIndex: number): Point {
    const n = this.graph().nodes.find(nn => nn.id === nodeId);
    if (!n || n.kind !== 'condition') return { x: 0, y: 0 };
    
    const off = this.dragOffsets[nodeId] || { x: 0, y: 0 };
    const conditions = (n.data as ConditionNodeData).conditions || [];
    
    // Calcular posição para a condição específica ao longo do lado direito do losango
    const s = 120;
    const margin = (s * Math.SQRT2 - s) / 2;
    
    // Para a condição específica, calcular um ponto ao longo do lado direito
    const t = conditions.length === 1 ? 0.5 : conditionIndex / (conditions.length - 1);
    const x = n.position.x + off.x + s + margin;
    const y = n.position.y + off.y + margin + t * s;
    
    return { x, y };
  }
  
  // Método para obter o ponto de saída correto com base na edge
  private getOutPointForEdge(edge: GraphEdge): Point {
    const fromNode = this.graph().nodes.find(n => n.id === edge.from);
    if (!fromNode || fromNode.kind !== 'condition' || !edge.conditionId) {
      return this.outPoint(edge.from);
    }
    
    // Encontrar o índice da condição com base no conditionId
    const conditions = (fromNode.data as ConditionNodeData).conditions || [];
    const conditionIndex = conditions.findIndex(c => c.id === edge.conditionId);
    
    if (conditionIndex === -1) {
      return this.outPoint(edge.from);
    }
    
    return this.conditionOutPoint(edge.from, conditionIndex);
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

  private path(p1: Point, p2: Point) {
    const mx = (p1.x + p2.x) / 2;
    return `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  pathBetween(edge: GraphEdge) {
    const out = this.getOutPointForEdge(edge);
    return this.path(out, this.inPoint(edge.to));
  }

  pathToPoint(fromId: string, to: Point) {
    const fromNode = this.graph().nodes.find(n => n.id === fromId);

    // Se estamos conectando a partir de um nó de condição, usar o handle correto
    if (fromNode && fromNode.kind === 'condition' && this.connectingConditionId) {
      const conditions = (fromNode.data as ConditionNodeData).conditions || [];
      const index = conditions.findIndex(c => c.id === this.connectingConditionId);
      const outPoint = index !== -1 ? this.conditionOutPoint(fromId, index) : this.outPoint(fromId);
      return this.path(outPoint, to);
    }

    return this.path(this.outPoint(fromId), to);
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
      const conditionId = this.connectingConditionId || undefined;
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
