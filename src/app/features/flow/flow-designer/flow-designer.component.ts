import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaletteComponent } from '../palette/palette.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { GraphStateService } from '../graph-state.service';
import { GraphMapperService } from '../graph-mapper.service';
import { AsyncPipe } from '@angular/common';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [NgIf, AsyncPipe, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, PaletteComponent, CanvasComponent, InspectorComponent],
  template: `
  <div class="palette">
    <app-palette (add)="onAdd($event)"></app-palette>
    <span class="spacer"></span>
    <mat-form-field appearance="outline" class="form-name-field">
      <mat-label>Nome do Formulário</mat-label>
      <input matInput [(ngModel)]="formName" placeholder="Informe o nome..." />
    </mat-form-field>
  </div>
  <div class="flow-shell" [class.resizing]="resizing">
    <app-inspector
      *ngIf="(state.sidebarOpen$ | async)"
      [style.width.px]="inspectorWidth"
      style="min-width: 342px;">
    </app-inspector>
    <div
      *ngIf="(state.sidebarOpen$ | async)"
      class="resizer"
      (mousedown)="startResizing($event)"
      title="Arraste para redimensionar">
    </div>
    <app-canvas></app-canvas>
  </div>
  `,
  styleUrl: './flow-designer.component.scss'
})
export class FlowDesignerComponent {
  inspectorWidth = 320;
  private minWidth = 240;
  private maxWidthRatio = 0.6; // 60% da largura disponível
  resizing = false;
  private startX = 0;
  private startWidth = 320;
  formName = '';

  constructor(public state: GraphStateService, private mapper: GraphMapperService) {
    const saved = Number(localStorage.getItem('inspectorWidth'));
    if (!Number.isNaN(saved) && saved >= this.minWidth) {
      this.inspectorWidth = saved;
    }
  }

  startResizing(event: MouseEvent) {
    this.resizing = true;
    this.startX = event.clientX;
    this.startWidth = this.inspectorWidth;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizing) return;
    const delta = event.clientX - this.startX; // inspector está à esquerda do resizer
    const shell = document.querySelector('.flow-shell') as HTMLElement | null;
    const containerWidth = shell ? shell.clientWidth : window.innerWidth;
    const maxWidth = Math.max(this.minWidth, Math.floor(containerWidth * this.maxWidthRatio));
    this.inspectorWidth = Math.min(maxWidth, Math.max(this.minWidth, this.startWidth + delta));
  }

  @HostListener('window:mouseup')
  stopResizing() {
    if (!this.resizing) return;
    this.resizing = false;
    try { localStorage.setItem('inspectorWidth', String(this.inspectorWidth)); } catch {}
  }

  onAdd(e:{kind:string,type?:string,conditionType?:'comparison'|'expression'}){
    const pos = { x: 80 + Math.random()*120, y: 120 + Math.random()*80 };
    if(e.kind==='question') this.state.addNode('question', { id:'', label:'What is your name?', type: e.type||'text', score:0, trueLabel:'Verdadeiro', falseLabel:'Falso', options:[] }, pos);
    if(e.kind==='condition') {
      if(e.conditionType === 'expression') {
        this.state.addNode('condition', {
          conditionType: 'expression',
          conditions: [{
            type: 'expression',
            id: crypto.randomUUID(),
            expression: ''
          }]
        }, pos);
      } else {
        this.state.addNode('condition', {
          conditionType: 'comparison',
          conditions: [{
            type: 'comparison',
            id: crypto.randomUUID(),
            name: '',
            valueType: 'fixed',
            value: '',
            questionId: '',
            questionValueType: 'value',
            conditionId: '',
            operator: '==',
            compareValueType: 'fixed',
            compareValue: '',
            compareQuestionId: '',
            compareQuestionValueType: 'value',
            compareConditionId: ''
          }]
        }, pos);
      }
    }
    if(e.kind==='action') this.state.addNode('action', { type:'sendNotification', params:{ alertCode:'ALERTA' } }, pos);
    if(e.kind==='end') this.state.addNode('end', { label: 'Fim do Formulário', conditions: [] }, pos);
  }

  exportForm(){
    const graph = this.state.graph;
    const form = this.mapper.toFormDefinition(graph, { name: 'Formulário Criado', status: 'draft', version: 1 });
    console.log('FormDefinition =>', form);
    alert('FormDefinition gerado! Veja no console do navegador.');
  }
}



