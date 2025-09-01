import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faEdit, faTimes, faTrash, faComment, faGear, faCodeBranch } from '@fortawesome/free-solid-svg-icons';

import { GraphModel, GraphNode, Point } from '../graph.types';
import { GraphStateService } from '../graph-state.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  styleUrl: './canvas.component.scss',
  imports: [
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe,
    DragDropModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, FontAwesomeModule, FormsModule
  ],
  templateUrl: './canvas.component.html'
})
export class CanvasComponent {
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLDivElement>;

  // Font Awesome icons
  faEdit = faEdit;
  faTrash = faTrash;
  faCheck = faCheck;
  faTimes = faTimes;
  faComment = faComment;
  faGear = faGear;
  faCodeBranch = faCodeBranch;

  focused: 'label' | 'type' | null = null;

  // pan/zoom do canvas
  offset = { x: 0, y: 0 };
  zoom = 1;
  private panning = false;
  private panStart = { x: 0, y: 0 };
  private panOffsetStart = { x: 0, y: 0 };
  selectedId;
  graph;

  editingNodeId: string | null = null;
  editBuffer: any = {};

  // conexão entre nós
  connectingFrom: string | null = null;
  tempConnection: Point = { x: 0, y: 0 };

  constructor(private state: GraphStateService) {
    /** Observa o grafo e o id selecionado do serviço (sem depender de getters opcionais) */
    this.graph = toSignal(this.state.graph$, { initialValue: { nodes: [], edges: [] } as GraphModel });
    this.selectedId = toSignal(this.state.selectedId$, { initialValue: null as string | null });

  }

  // helpers p/ arestas (centros aproximados por tipo)
  centerX(id: string) {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    const w = n.kind === 'condition' ? 120 : n.kind === 'action' ? 180 : 200;
    return n.position.x + w / 2;
  }
  centerY(id: string) {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    const h = n.kind === 'condition' ? 120 : n.kind === 'action' ? 80 : 90;
    return n.position.y + h / 2;
  }

  // seleção
  isSelected(id: string) { return this.selectedId() === id; }
  select(id: string)      { this.state.select(id); }
  deselect()              { this.state.select(null); }

  // drag do nó
  dragEnd(n: GraphNode, ev: CdkDragEnd) {
    const delta = ev.source.getFreeDragPosition();
    this.state.moveNode(n.id, {
      x: n.position.x + delta.x,
      y: n.position.y + delta.y
    });
    ev.source.reset();
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

  startConnection(fromId: string, ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    this.connectingFrom = fromId;
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
      this.state.connect(this.connectingFrom, toId);
    }
    this.connectingFrom = null;
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

  startEdit(node: GraphNode) {
    this.select(node.id);
    this.editingNodeId = node.id;
    this.editBuffer = { ...node.data };
  }

  confirmEdit(node: GraphNode) {
    if (this.editingNodeId !== node.id) return;
    this.state.updateNode(node.id, { ...node.data, ...this.editBuffer });
    this.editingNodeId = null;
    this.editBuffer = {};
  }

  cancelEdit() {
    this.editingNodeId = null;
    this.editBuffer = {};
  }

  deleteNode(id: string) {
    this.state.removeNode(id);
  }

  get viewBox() {
    const cw = this.canvasRef?.nativeElement.clientWidth || 1;
    const ch = this.canvasRef?.nativeElement.clientHeight || 1;
    const worldW = 2000;
    const worldH = 1200;
    return {
      width: 120 * (cw / (worldW * this.zoom)),
      height: 80 * (ch / (worldH * this.zoom)),
      left: -this.offset.x / (worldW * this.zoom) * 120,
      top: -this.offset.y / (worldH * this.zoom) * 80
    };
  }
}
