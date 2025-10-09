import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaletteComponent } from '../palette/palette.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { GraphStateService } from '../graph-state.service';
import { GraphMapperService } from '../graph-mapper.service';
import { AsyncPipe, NgIf, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [NgIf, AsyncPipe, NgStyle, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, FontAwesomeModule, PaletteComponent, CanvasComponent, InspectorComponent],
  template: `
  <div class="palette">
    <app-palette (add)="onAdd($event)"></app-palette>
    <span class="spacer"></span>
    <mat-form-field appearance="outline" class="form-name-field nome-formulario">
      <mat-label>Nome do Formulário</mat-label>
      <input matInput [(ngModel)]="formName" placeholder="Informe o nome..." />
    </mat-form-field>
    <button mat-raised-button color="primary" (click)="saveForm()" [disabled]="saving || !(formName?.trim())" title="Salvar">
      <ng-container *ngIf="saving; else savedOrDefault">
        <mat-progress-spinner [diameter]="18" mode="indeterminate"></mat-progress-spinner>
        <span style="margin-left:8px">Salvando...</span>
      </ng-container>
      <ng-template #savedOrDefault>
        <fa-icon [icon]="faCheck" [ngStyle]="savedOk ? {'color':'#2e7d32'} : {}" style="margin-right:6px"></fa-icon>
        <span>{{ savedOk ? 'Salvo' : 'Salvar' }}</span>
      </ng-template>
    </button>
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
  private maxWidthRatio = 0.6;
  resizing = false;
  private startX = 0;
  private startWidth = 320;
  formName = '';
  faCheck = faCheck;
  saving = false;
  savedOk = false;

  constructor(public state: GraphStateService, private mapper: GraphMapperService, private snack: MatSnackBar) {
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
    const delta = event.clientX - this.startX;
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent) {
    // Close inspector when clicking outside nodes and inspector UI
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    // If inspector host not visible, ignore
    const inspectorHost = document.querySelector('app-inspector') as HTMLElement | null;
    if (!inspectorHost) return;

    // Click inside inspector host? keep it open
    if (inspectorHost.contains(target)) return;

    // Click inside any node wrapper? keep open (user interacting with node)
    const insideNode = target.closest('.node-wrapper');
    if (insideNode) return;

    // Otherwise, close the inspector
    this.state.closeSidebar();
  }

  onAdd(e:{kind:string,type?:string,conditionType?:'comparison'|'expression'}){
    const pos = { x: 80 + Math.random()*120, y: 120 + Math.random()*80 };
    if(e.kind==='question') this.state.addNode('question', { id:'', label:'What is your name?', type: e.type||{id: 0, label:'Texto'}, score:0, trueLabel:'Verdadeiro', falseLabel:'Falso', options:[] }, pos);
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
    this.snack.open('FormDefinition gerado! Veja o console do navegador.', 'Fechar', { duration: 3000 });
  }

  saveForm() {
    const name = (this.formName || '').trim();
    if (!name) return;
    try {
      this.saving = true;
      this.savedOk = false;
      const graph = this.state.graph;
      const form = this.mapper.toFormDefinition(graph, { name, status: 'draft', version: 1 });
      const payload = { savedAt: new Date().toISOString(), name, form, graph };
      localStorage.setItem(`formDesigner:saved:${name}`, JSON.stringify(payload));
      localStorage.setItem('formDesigner:lastSavedName', name);
      console.log('Formulario salvo:', payload);
      this.snack.open('Formulário salvo com sucesso!', 'Fechar', { duration: 2500 });
      this.savedOk = true;
    } catch (e) {
      console.error('Erro ao salvar formulario', e);
      this.snack.open('Não foi possível salvar o formulário.', 'Fechar', { duration: 3500 });
    }
    finally {
      // dar um pequeno tempo para mostrar o spinner antes de concluir
      setTimeout(() => { this.saving = false; }, 300);
      // limpar estado "salvo" após um tempo
      setTimeout(() => { this.savedOk = false; }, 1500);
    }
  }
}
