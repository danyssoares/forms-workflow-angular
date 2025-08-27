import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';

import { GraphModel, GraphNode } from '../graph.types';
import { GraphStateService } from '../graph-state.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe,
    DragDropModule
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

          <ng-container [ngSwitch]="n.kind">

            <!-- Question = Parallelogram -->
            <div *ngSwitchCase="'question'" class="content">
              <div class="title">💬 Questão #{{ n.data.seq }}</div>
              <div style="font-size:18px">{{ n.data.label || 'Pergunta' }}</div>
              <div class="sub">{{ n.data.type | titlecase }}</div>
            </div>

            <!-- Condition = Diamond -->
            <div *ngSwitchCase="'condition'" class="diamond">
              <div class="content">
                <div class="title">🔗 Condição #{{ n.data.seq }}</div>
                <div class="sub">{{ n.data.operator || 'É igual a' }} {{ n.data.value ?? '' }}</div>
              </div>
            </div>

            <!-- Action = Rectangle -->
            <div *ngSwitchCase="'action'">
              <div class="title">✉️ Ação #{{ n.data.seq }}</div>
              <div class="sub">{{ n.data.type || 'emitAlert' }}</div>
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

  // pan/zoom do canvas
  offset = { x: 0, y: 0 };
  zoom = 1;
  private panning = false;
  private panStart = { x: 0, y: 0 };
  private panOffsetStart = { x: 0, y: 0 };
  selectedId;
  graph;

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

  zoomIn()  { this.zoom = Math.min(2, this.zoom + 0.1); }
  zoomOut() { this.zoom = Math.max(0.5, this.zoom - 0.1); }

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
