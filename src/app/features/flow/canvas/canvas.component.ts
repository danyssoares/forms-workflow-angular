import { Component, effect, signal } from '@angular/core';
import { NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe } from '@angular/common';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { GraphModel, GraphNode } from '../graph.types';
import { GraphStateService } from '../graph-state.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [
    // Angular
    NgFor, NgIf, NgStyle, NgSwitch, NgSwitchCase, TitleCasePipe,
    // CDK + Material
    DragDropModule, MatIconModule, MatButtonModule
  ],
  template: `
  <div class="canvas" (click)="deselect()">
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
      class="node"
      [class.question]="n.kind === 'question'"
      [class.condition]="n.kind === 'condition'"
      [class.action]="n.kind === 'action'"
      (click)="$event.stopPropagation(); select(n.id)">

      <ng-container [ngSwitch]="n.kind">

        <!-- Question Node -->
        <div *ngSwitchCase="'question'">
          <div class="title">💬 Questão</div>
          <div style="font-size:18px">{{ n.data.label || 'Pergunta' }}</div>
          <div class="sub">{{ n.data.type | titlecase }}</div>
          <div class="actions">
            <button mat-icon-button (click)="connectFrom(n); $event.stopPropagation()">
              <mat-icon>call_made</mat-icon>
            </button>
            <button mat-icon-button (click)="remove(n.id); $event.stopPropagation()">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <!-- Condition Node -->
        <div *ngSwitchCase="'condition'" class="inner">
          <div class="title">🔗 Condição</div>
          <div class="sub">{{ n.data.operator || 'É igual a' }} {{ n.data.value ?? '' }}</div>
        </div>

        <!-- Action Node -->
        <div *ngSwitchCase="'action'">
          <div class="title">✉️ Ação</div>
          <div class="sub">{{ n.data.type || 'emitAlert' }}</div>
        </div>

      </ng-container>
    </div>
  </div>
  `
})
export class CanvasComponent {
  graph = signal<GraphModel>({ nodes: [], edges: [] });
  private pendingFrom: string | null = null;

  constructor(private state: GraphStateService) {
    // espelha o estado global no signal local usado no template
    effect(() => this.graph.set(this.state.graph));
  }

  // helpers de desenho
  centerX(id: string) {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    // largura média ~180; ajuste se precisar
    return n.position.x + 90;
  }
  centerY(id: string) {
    const n = this.graph().nodes.find(nn => nn.id === id)!;
    // altura média ~100; ajuste se precisar
    return n.position.y + 50;
  }

  // interações
  dragEnd(n: GraphNode, ev: CdkDragEnd) {
    const p = ev.source.getFreeDragPosition();
    this.state.moveNode(n.id, { x: p.x, y: p.y });
  }
  select(id: string) { this.state.select(id); }
  deselect() { this.state.select(null); }
  remove(id: string) { this.state.removeNode(id); }

  connectFrom(n: GraphNode) {
    this.pendingFrom = n.id;
    // aguarda o próximo clique num outro nó para conectar
    document.addEventListener('click', this.connectNext, { once: true });
  }

  private connectNext = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    const nodeEl = target.closest('.node') as HTMLElement | null;
    if (nodeEl) {
      // localiza o nó de destino pelo índice visual
      const siblings = Array.from(nodeEl.parentElement!.children)
        .filter(el => el.classList.contains('node')) as HTMLElement[];
      const idx = siblings.indexOf(nodeEl);
      const to = this.graph().nodes[idx];
      if (this.pendingFrom && to) this.state.connect(this.pendingFrom, to.id);
    }
    this.pendingFrom = null;
  };
}
