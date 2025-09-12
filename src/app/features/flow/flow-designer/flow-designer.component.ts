import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaletteComponent } from '../palette/palette.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { GraphStateService } from '../graph-state.service';
import { GraphMapperService } from '../graph-mapper.service';
import { AsyncPipe } from '@angular/common';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [NgIf, AsyncPipe, MatButtonModule, MatIconModule, PaletteComponent, CanvasComponent, InspectorComponent],
  template: `
  <div class="palette">
    <app-palette (add)="onAdd($event)"></app-palette>
    <span class="spacer"></span>
    <button mat-stroked-button color="primary" (click)="exportForm()"><mat-icon>play_circle</mat-icon> Exportar para FormDefinition</button>
  </div>
  <div class="flow-shell">
    <app-inspector *ngIf="(state.sidebarOpen$ | async)"></app-inspector>
    <app-canvas></app-canvas>
  </div>
  `,
  styleUrl: './flow-designer.component.scss'
})
export class FlowDesignerComponent {
  constructor(public state: GraphStateService, private mapper: GraphMapperService) {}

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
    if(e.kind==='end') this.state.addNode('end', { label: 'Fim do Formulário' }, pos);
  }

  exportForm(){
    const graph = this.state.graph;
    const form = this.mapper.toFormDefinition(graph, { name: 'Formulário Criado', status: 'draft', version: 1 });
    console.log('FormDefinition =>', form);
    alert('FormDefinition gerado! Veja no console do navegador.');
  }
}