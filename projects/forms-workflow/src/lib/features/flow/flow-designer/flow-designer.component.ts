import { Component, HostListener, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaletteComponent } from '../palette/palette.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { InspectorComponent } from '../inspector/inspector.component';
import { GraphStateService } from '../graph-state.service';
import { GraphMapperService } from '../graph-mapper.service';
import { AsyncPipe, NgIf, NgStyle } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { TranslationPipe } from '@angulartoolsdr/translation';
import { QuestionTypeOption, QuestionTypeDefinition, createQuestionTypeOption, getQuestionTypePromptKey, questionTypeDefinitions } from '../../../shared/models/form-models';
import { TranslationService } from '@angulartoolsdr/translation';
import { WorkflowStorageService } from '../workflow-storage.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ControlMaterialComponent } from '@angulartoolsdr/control-material';

@Component({
  selector: 'app-flow-designer',
  standalone: true,
  imports: [
    NgIf, 
    AsyncPipe, 
    NgStyle, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    MatIconModule, 
    MatSnackBarModule, 
    MatProgressSpinnerModule, 
    FontAwesomeModule, 
    PaletteComponent, 
    CanvasComponent, 
    InspectorComponent,
    TranslationPipe,
    ControlMaterialComponent
  ],
  templateUrl: './flow-designer.component.html',  
  styleUrl: './flow-designer.component.scss'
})
export class FlowDesignerComponent implements OnInit {
  inspectorWidth = 320;
  private minWidth = 240;
  private maxWidthRatio = 0.6;
  private currentWorkflowName: string | null = null;
  resizing = false;
  private startX = 0;
  private startWidth = 320;
  form = new FormGroup({
    formName: new FormControl('', [Validators.required, Validators.pattern(/\S+/)])
  });
  get formNameControl() { return this.form.get('formName') as FormControl; }
  faCheck = faCheck;
  saving = false;
  savedOk = false;
  private readonly translation = inject(TranslationService);
  // disabled state now derives from form control validity

  constructor(
    public state: GraphStateService,
    private mapper: GraphMapperService,
    private snack: MatSnackBar,
    private workflowStorage: WorkflowStorageService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const saved = Number(localStorage.getItem('inspectorWidth'));
    if (!Number.isNaN(saved) && saved >= this.minWidth) {
      this.inspectorWidth = saved;
    }
  }

  ngOnInit(): void {
    const workflowName = this.route.snapshot.queryParamMap.get('workflow');
    if (workflowName) {
      const snapshot = this.workflowStorage.loadWorkflow(workflowName);
      if (snapshot) {
        this.state.setGraph(snapshot.graph);
        this.formNameControl.setValue(snapshot.formName ?? snapshot.name ?? '');
        this.currentWorkflowName = snapshot.name ?? workflowName;
        this.snack.open('Workflow carregado com sucesso!', 'Fechar', { duration: 2000 });
      } else {
        this.snack.open('Workflow não encontrado.', 'Fechar', { duration: 3000 });
        this.state.setGraph({ nodes: [], edges: [] });
        this.formNameControl.setValue('');
        this.currentWorkflowName = null;
      }
    } else {
      this.state.setGraph({ nodes: [], edges: [] });
      this.formNameControl.setValue('');
      this.currentWorkflowName = null;
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
    // Close inspector only when clicking on canvas background (not on nodes)
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    // If click happens inside an Angular Material overlay (e.g., mat-select, mat-menu),
    // keep the inspector open while interacting with overlay content.
    const overlayContainer = document.querySelector('.cdk-overlay-container') as HTMLElement | null;
    if (overlayContainer && overlayContainer.contains(target)) return;

    // If inspector host not visible, ignore
    const inspectorHost = document.querySelector('app-inspector') as HTMLElement | null;
    if (!inspectorHost) return;

    // Click inside inspector host? keep it open
    if (inspectorHost.contains(target)) return;

    // Click inside any node wrapper? keep open (user interacting with node)
    const insideNode = target.closest('.node-wrapper');
    if (insideNode) return;

    // Only close if the click happened within the canvas area (background)
    const canvasHost = document.querySelector('.canvas') as HTMLElement | null;
    if (!canvasHost) return;
    if (!canvasHost.contains(target)) return;

    // Otherwise, close the inspector (clicked on canvas background)
    this.state.closeSidebar();
  }

  onAdd(e:{kind:string,type?:QuestionTypeDefinition,conditionType?:'comparison'|'expression'}){
    const pos = { x: 80 + Math.random()*120, y: 120 + Math.random()*80 };
    if(e.kind==='question') {
      const definition = e.type ?? questionTypeDefinitions[0];
      const typeOption: QuestionTypeOption = createQuestionTypeOption(
        definition,
        (key) => this.translation.instant(key)
      );
      const labelKey = getQuestionTypePromptKey(typeOption?.id);
      const label = this.translation.instant(labelKey);
      this.state.addNode('question', { 
        id: 'q_' + crypto.randomUUID().slice(0,4), 
        label,
        type: typeOption, 
        score:0, 
        trueLabel:'Verdadeiro', 
        falseLabel:'Falso', 
        options:[]
      }, pos);
    }
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
    if(e.kind==='end') this.state.addNode('end', { label: 'END', conditions: [] }, pos);
  }

  exportForm(){
    const graph = this.state.graph;
    const form = this.mapper.toFormDefinition(graph, { name: 'Formulário Criado', status: 'draft', version: 1 });
    console.log('FormDefinition =>', form);
    this.snack.open('FormDefinition gerado! Veja o console do navegador.', 'Fechar', { duration: 3000 });
  }

  saveForm() {
    const name = (this.formNameControl.value || '').trim();
    if (!name) return;
    const previousName = this.currentWorkflowName;
    const renamed = !!previousName && previousName !== name;
    try {
      this.saving = true;
      this.savedOk = false;
      const graph = this.state.graph;
      const form = this.mapper.toFormDefinition(graph, { name, status: 'draft', version: 1 });
      const snapshot = this.workflowStorage.saveWorkflow(name, graph, name);
      if (renamed && previousName) {
        this.workflowStorage.deleteWorkflow(previousName);
      }
      this.currentWorkflowName = snapshot.name;
      localStorage.setItem('formDesigner:lastSavedName', snapshot.name);
      console.log('Workflow salvo:', { snapshot, form });
      this.snack.open('Fluxo salvo com sucesso!', 'Fechar', { duration: 2500 });
      this.savedOk = true;
    } catch (e) {
      console.error('Erro ao salvar workflow', e);
      this.snack.open('Não foi possível salvar o fluxo.', 'Fechar', { duration: 3500 });
    }
    finally {
      // dar um pequeno tempo para mostrar o spinner antes de concluir
      setTimeout(() => { this.saving = false; }, 300);
      // limpar estado "salvo" após um tempo
      setTimeout(() => { this.savedOk = false; }, 1500);
    }
  }

  goToList() {
    this.router.navigate(['/flow']);
  }
}
