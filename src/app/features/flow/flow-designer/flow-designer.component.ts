import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaletteComponent } from '../palette/palette.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { GraphStateService } from '../graph-state.service';
import { GraphMapperService } from '../graph-mapper.service';

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, PaletteComponent, CanvasComponent, InspectorComponent],
  template: `
  <div class="palette">
    <app-palette (add)="onAdd($event)"></app-palette>
    <span class="spacer"></span>
    <button mat-stroked-button color="primary" (click)="exportForm()"><mat-icon>play_circle</mat-icon> Exportar para FormDefinition</button>
  </div>
  <div class="flow-shell">
    <app-canvas></app-canvas>
    <app-inspector></app-inspector>
  </div>
  `,
  styleUrl: './flow-designer.component.scss'
})
export class FlowDesignerComponent {
  constructor(private state: GraphStateService, private mapper: GraphMapperService) {}

  onAdd(e:{kind:string,type?:string}){
    const pos = { x: 80 + Math.random()*120, y: 120 + Math.random()*80 };
    if(e.kind==='question') this.state.addNode('question', { id:'', label:'What is your name?', type: e.type||'text' }, pos);
    if(e.kind==='condition') this.state.addNode('condition', { operator: '==', value: '' }, pos);
    if(e.kind==='action') this.state.addNode('action', { type:'emitAlert', params:{ alertCode:'ALERTA' } }, pos);
    if(e.kind==='end') this.state.addNode('end', { label: 'Fim do Formulário' }, pos);
  }

  exportForm(){
    const graph = this.state.graph;
    const form = this.mapper.toFormDefinition(graph, { name: 'Formulário Criado', status: 'draft', version: 1 });
    console.log('FormDefinition =>', form);
    alert('FormDefinition gerado! Veja no console do navegador.');
  }
}