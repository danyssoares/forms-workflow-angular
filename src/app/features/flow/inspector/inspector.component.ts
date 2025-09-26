import { Component, computed, effect, inject, Signal, ViewChildren, QueryList } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faTimes, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { GraphStateService } from '../graph-state.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { GraphModel, QuestionNodeData, GraphNode, Condition, ComparisonCondition, ExpressionCondition, ConditionNodeData, EndNodeData, EndScoreCondition } from '../graph.types';
import { ConditionEditorComponent } from '../node-condition/condition-editor/condition-editor.component';
import { ExpressionConditionEditorComponent } from '../node-condition/expression-condition-editor/expression-condition-editor.component';
import { ControlMaterialComponent, ControlMaterialNumberComponent } from '@angulartoolsdr/control-material';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [ControlMaterialNumberComponent, ControlMaterialComponent,
    NgIf, NgSwitch, NgSwitchCase, NgFor, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    FontAwesomeModule, ConditionEditorComponent, ExpressionConditionEditorComponent,
    FormsModule,
    
  ],
  templateUrl: './inspector.component.html',
  styleUrl: './inspector.component.scss'
})
export class InspectorComponent {
  library = inject(FaIconLibrary);
  graph: Signal<GraphModel>;
  selectedId: Signal<string | null>;
  node = computed(() => this.graph().nodes.find(n => n.id === this.selectedId()));
  availableQuestions = computed(() => {
    const g = this.graph();
    let questions = g.nodes
      .filter(n => n.kind === 'question' && n.data.type !== 'image') as GraphNode<QuestionNodeData>[];

    const selectedNode = g.nodes.find(n => n.id === this.selectedId());
    if (selectedNode && selectedNode.kind === 'condition') {
      const reachable = new Set<string>();
      const visit = (id: string) => {
        g.edges.filter(e => e.to === id).forEach(e => {
          if (!reachable.has(e.from)) {
            reachable.add(e.from);
            visit(e.from);
          }
        });
      };
      visit(selectedNode.id);
      questions = questions.filter(q => reachable.has(q.id));
    }

    return questions.sort((a, b) => (a.data.seq || 0) - (b.data.seq || 0));
  });

  availableConditions = computed(() => {
    const g = this.graph();
    const selectedNode = g.nodes.find(n => n.id === this.selectedId());
    if (!selectedNode || selectedNode.kind !== 'condition') return [] as Condition[];

    const reachableConditionIds = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      g.edges.filter(e => e.to === id).forEach(e => {
        if (e.conditionId) {
          reachableConditionIds.add(e.conditionId);
        } else {
          const fromNode = g.nodes.find(n => n.id === e.from);
          if (fromNode && fromNode.kind === 'condition') {
            (fromNode.data as ConditionNodeData).conditions.forEach(c => reachableConditionIds.add(c.id));
          }
        }
        visit(e.from);
      });
    };
    visit(selectedNode.id);

    const conditions: Condition[] = [];
    g.nodes.forEach(n => {
      if (n.kind !== 'condition') return;
      (n.data.conditions || []).forEach((c: any) => {
        if (reachableConditionIds.has(c.id)) conditions.push(c);
      });
    });
    return conditions;
  });

  fgQ: FormGroup;
  fgA: FormGroup;
  conditionData: Condition[] = [];
  conditionType: 'comparison' | 'expression' = 'comparison';
  fgEnd: FormGroup;
  trackEndCondition = (_: number, c: EndScoreCondition) => c.id;

  faTimes = faTimes;
  faCheck = faCheck;
  faTrash = faTrash;
  faPlus = faPlus;

  @ViewChildren(ExpressionConditionEditorComponent) expressionEditors!: QueryList<ExpressionConditionEditorComponent>;

  constructor(private state: GraphStateService, private fb: FormBuilder) {
    this.library.addIcons(faTimes, faCheck, faTrash, faPlus);
    this.fgQ = this.fb.group({
      label: [''],
      type: ['text'],
      score: [0],
      trueLabel: ['Verdadeiro'],
      falseLabel: ['Falso'],
      options: this.fb.array([]),
      seq: [1]
    });
    this.fgA = this.fb.group({ type: ['sendNotification'] });
    this.fgEnd = this.fb.group({ conditions: this.fb.array([]) });

    this.graph = toSignal(this.state.graph$, {initialValue:{nodes:[],edges:[]}});
    this.selectedId = toSignal(this.state.selectedId$, {initialValue: null});

    effect(() => {
      const n = this.node();
      if (!n) return;
      if (n.kind === 'question') {
        const opts = n.data.options || [];
        const arr = this.options;
        arr.clear();
        opts.forEach((o: { label: any; value: any; score?: number; }) => 
          arr.push(this.fb.group({ label: [o.label], value: [o.value], score: [o.score ?? 0] }))
        );
        this.fgQ.patchValue({ 
          label: n.data.label, 
          type: n.data.type, 
          score: n.data.score || 0, 
          trueLabel: n.data.trueLabel || 'Verdadeiro', 
          falseLabel: n.data.falseLabel || 'Falso',
          seq: n.data.seq || 1
        });
      }
      if (n.kind === 'condition') {
        this.conditionType = n.data.conditionType || 'comparison';
        this.conditionData = (n.data.conditions || []).map((c: any) => ({
          type: c.type || this.conditionType,
          ...c
        }));
      }
      if (n.kind === 'end') {
        const data = n.data as EndNodeData;
        const arr = this.fgEnd.get('conditions') as FormArray;
        arr.clear();
        (data.conditions || []).forEach(c => {
          arr.push(this.fb.group({
            id: [c.id],
            name: [c.name || ''],
            operator: [c.operator || '>='],
            value: [c.value ?? null]
          }));
        });
      }
      if (n.kind === 'action') this.fgA.patchValue({ type: n.data.type });
    });
  }

  get options() { return this.fgQ.get('options') as FormArray; }
  addOption() { this.options.push(this.fb.group({ label: [''], value: [''], score: [0] })); }
  removeOption(i: number) { this.options.removeAt(i); }

  addCondition() {
    if (this.conditionType === 'comparison') {
      const newCondition: ComparisonCondition = {
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
      };
      this.conditionData.push(newCondition);
    } else {
      const newCondition: ExpressionCondition = {
        type: 'expression',
        id: crypto.randomUUID(),
        name: '',
        expression: ''
      };
      this.conditionData.push(newCondition);
    }
  }

  addExpressionCondition() {
    const newCondition: ExpressionCondition = {
      type: 'expression',
      id: crypto.randomUUID(),
      name: '',
      expression: ''
    };
    this.conditionData.push(newCondition);
  }

  removeCondition(index: number) {
    this.conditionData.splice(index, 1);
  }

  get endConditionsArray() { return this.fgEnd.get('conditions') as FormArray; }
  addEndCondition() {
    this.endConditionsArray.push(this.fb.group({ id:[crypto.randomUUID()], name:[''], operator:['>='], value:[null] }));
  }
  removeEndCondition(index: number) {
    this.endConditionsArray.removeAt(index);
  }

  setRange(c: EndScoreCondition, idx: 0 | 1, value: any) {
    if (!c.range) c.range = [0, 0];
    const num = Number(value);
    c.range[idx] = Number.isNaN(num) ? 0 : num;
  }

  private buildExpressionContext(): Record<string, any> {
    const ctx: Record<string, any> = {};
    this.availableQuestions().forEach(q => {
      ctx[q.data.id] = { valor: '', score: q.data.score || 0 };
    });
    this.availableConditions().forEach(c => {
      ctx[c.id] = false;
    });
    return ctx;
  }

  // Removido o update imediato; a persistência para nó Fim acontece em save()

  save() {
    const n = this.node();
    if (!n) return;

    if (n.kind === 'condition' && this.conditionType === 'expression') {
      const ctx = this.buildExpressionContext();
      let allValid = true;
      this.expressionEditors.forEach(ed => {
        if (!ed.validate(ctx)) allValid = false;
      });
      if (!allValid) return;
    }

    if (n.kind === 'question') {
      const formValue = this.fgQ.value as any;
      
      // Check if another question node already has this seq value
      const duplicateSeq = this.graph().nodes.some(node => 
        node.kind === 'question' && 
        node.id !== n.id && 
        node.data.seq === formValue.seq
      );
      
      if (duplicateSeq) {
        alert('Já existe uma questão com esta ordem. Por favor, escolha um número diferente.');
        return;
      }
      
      const data: any = { 
        ...n.data, 
        label: formValue.label, 
        type: formValue.type, 
        score: formValue.score,
        seq: formValue.seq
      };
      
      data.id = n.data.id || `q_${n.id.slice(0,4)}`;
      if (formValue.type === 'boolean') {
        data.trueLabel = formValue.trueLabel;
        data.falseLabel = formValue.falseLabel;
      }
      if (['select', 'radio', 'checkbox'].includes(formValue.type)) {
        data.options = formValue.options || [];
      }
      this.state.updateNode(n.id, data);
    }
    
    if (n.kind === 'condition') {
      this.state.updateNode(n.id, {
        ...n.data,
        conditionType: this.conditionType,
        conditions: this.conditionData
      });
    }
    
    if (n.kind === 'end') {
      const raw = (this.endConditionsArray.value || []) as any[];
      const normalized: EndScoreCondition[] = raw.map((c:any) => ({
        id: c.id || crypto.randomUUID(),
        name: c.name || '',
        operator: (c.operator || '>=') as EndScoreCondition['operator'],
        value: c.value === null || c.value === undefined || c.value === '' ? 0 : Number(c.value),
      }));
      const data: EndNodeData = { ...(n.data as EndNodeData), conditions: normalized };
      this.state.updateNode(n.id, data);
    }
    
    if (n.kind === 'action') {
      this.state.updateNode(n.id, { ...n.data, type: this.fgA.value.type });
    }
    
    this.state.closeSidebar();
  }

  cancel() { this.state.closeSidebar(); }
}

