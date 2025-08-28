import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faEdit, faTimes, faTrash, faComment, faGear, faCodeBranch } from '@fortawesome/free-solid-svg-icons';

import { GraphModel, GraphNode } from '../graph.types';
import { GraphStateService } from '../graph-state.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  styleUrl: './canvas.component.scss',
  imports: [
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe,
    DragDropModule, MatButtonModule, FontAwesomeModule, FormsModule
  ],
  template: `
  <div
    #canvasEl
    class="canvas"
    (mousedown)="startPan($event)"
    (mousemove)="onPan($event)"
    (mouseup)="endPan()"
    (mouseleave)="endPan()"
    (click)="deselect()"
    (wheel)="onWheel($event)"
  >
    <div
      class="canvas-inner"
      [ngStyle]="{ transform: 'translate(' + offset.x + 'px,' + offset.y + 'px) scale(' + zoom + ')', 'transform-origin': '0 0' }">

      <!-- Edges -->
      <svg class="edge-svg">
        <ng-container *ngFor="let e of graph().edges">
          <line
            [attr.x1]="centerX(e.from)" [attr.y1]="centerY(e.from)"
            [attr.x2]="centerX(e.to)"   [attr.y2]="centerY(e.to)"
            stroke="#b9bed1" stroke-width="2" marker-end="url(#arrow)" />
        </ng-container>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#b9bed1" />
          </marker>
        </defs>
      </svg>

      <!-- Nodes -->
      <div
        *ngFor="let n of graph().nodes"
        cdkDrag
        (cdkDragEnded)="dragEnd(n, $event)"
        [ngStyle]="{ left: n.position.x + 'px', top: n.position.y + 'px' }"
        class="node-wrapper">

        <div
          class="node"
          [class.question]="n.kind === 'question'"
          [class.condition]="n.kind === 'condition'"
          [class.action]="n.kind === 'action'"
          [class.selected]="isSelected(n.id)"
          (click)="$event.stopPropagation(); select(n.id)">
          
          <!-- Action buttons (show only when node is selected) -->
          <div class="node-actions" *ngIf="isSelected(n.id)">
            <ng-container *ngIf="editingNodeId === n.id; else viewButtons">
              <button mat-icon-button class="action-btn edit-btn" (click)="confirmEdit(n)" title="Confirmar">
                <fa-icon [icon]="faCheck"></fa-icon>
              </button>
              <button mat-icon-button class="action-btn delete-btn" (click)="cancelEdit()" title="Cancelar">
                <fa-icon [icon]="faTimes"></fa-icon>
              </button>
            </ng-container>
            <ng-template #viewButtons>
              <button mat-icon-button class="action-btn edit-btn" (click)="startEdit(n)" title="Editar">
                <fa-icon [icon]="faEdit"></fa-icon>
              </button>
              <button mat-icon-button class="action-btn delete-btn" (click)="deleteNode(n.id)" title="Excluir">
                <fa-icon [icon]="faTrash"></fa-icon>
              </button>
            </ng-template>
          </div>

          <ng-container [ngSwitch]="n.kind">

            <!-- Question = Parallelogram -->
            <div *ngSwitchCase="'question'" class="content">
              <div class="title"><fa-icon [icon]="faComment"></fa-icon> Questão #{{ n.data.seq }}</div>
              <ng-container *ngIf="editingNodeId === n.id; else viewQuestion">
                <input [(ngModel)]="editBuffer.label" style="font-size:18px; width:100%;" />
                <select [(ngModel)]="editBuffer.type" style="width:100%;">
                  <option value="text">Texto</option>
                  <option value="boolean">Boolean</option>
                  <option value="integer">Inteiro</option>
                  <option value="double">Double</option>
                  <option value="select">Lista</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Data</option>
                  <option value="datetime">Data e Hora</option>
                  <option value="image">Imagem</option>
                </select>
              </ng-container>
              <ng-template #viewQuestion>
                <div style="font-size:18px">{{ n.data.label || 'Pergunta' }}</div>
                <div class="sub">{{ n.data.type | titlecase }}</div>
              </ng-template>
            </div>

            <!-- Condition = Diamond -->
            <div *ngSwitchCase="'condition'" class="diamond">
              <div class="content">
                <div class="title"><fa-icon [icon]="faCodeBranch"></fa-icon> Condição #{{ n.data.seq }}</div>
                <div class="sub">{{ n.data.operator || 'É igual a' }} {{ n.data.value ?? '' }}</div>
              </div>
            </div>

            <!-- Action = Rectangle -->
            <div *ngSwitchCase="'action'">
              <div class="title"><fa-icon [icon]="faGear"></fa-icon> Ação #{{ n.data.seq }}</div>
              <div *ngIf="editingNodeId === n.id; else viewAction" class="sub">
                <select [(ngModel)]="editBuffer.type" style="width:100%;">
                  <option value="emitAlert">emitAlert</option>
                  <option value="openForm">openForm</option>
                  <option value="webhook">webhook</option>
                  <option value="setTag">setTag</option>
                  <option value="setField">setField</option>
                </select>
              </div>
              <ng-template #viewAction>
                <div class="sub">{{ n.data.type || 'emitAlert' }}</div>
              </ng-template>
            </div>

          </ng-container>
        </div>
      </div>
    </div>

    <div class="zoom-controls">
      <button (click)="zoomIn()">+</button>
      <button (click)="zoomOut()">-</button>
    </div>

    <div class="mini-map">
      <div class="view" [ngStyle]="{
          left: viewBox.left + 'px',
          top: viewBox.top + 'px',
          width: viewBox.width + 'px',
          height: viewBox.height + 'px'
        }"></div>
    </div>
  </div>
  `
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
    // só inicia pan se clicou no fundo (fora de um .node)
    const hitNode = (ev.target as HTMLElement).closest('.node');
    if (hitNode) return;

    this.panning = true;
    this.panStart = { x: ev.clientX, y: ev.clientY };
    this.panOffsetStart = { ...this.offset };
  }
  onPan(ev: MouseEvent) {
    if (!this.panning) return;
    const dx = (ev.clientX - this.panStart.x) / this.zoom;
    const dy = (ev.clientY - this.panStart.y) / this.zoom;
    this.offset = { x: this.panOffsetStart.x + dx, y: this.panOffsetStart.y + dy };
  }
  endPan() { this.panning = false; }

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
