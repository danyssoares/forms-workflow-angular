import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ComparisonCondition, QuestionNodeData, GraphNode, Condition } from '../../graph.types';
import { ControlMaterialComponent, ControlMaterialSelectComponent } from '@angulartoolsdr/control-material';

@Component({
  selector: 'app-condition-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    FontAwesomeModule,
    ControlMaterialComponent,
    ControlMaterialSelectComponent
  ],
  templateUrl: './condition-editor.component.html',
  styleUrl: './condition-editor.component.scss'
})
export class ConditionEditorComponent implements OnInit, OnChanges {
  @Input() condition!: ComparisonCondition;
  @Input() index!: number;
  @Input() availableQuestions: GraphNode<QuestionNodeData>[] = [];
  @Input() availableConditions: Condition[] = [];
  @Output() remove = new EventEmitter<void>();

  library = inject(FaIconLibrary);

  faTrash = faTrash;

  conditionForm: FormGroup;
  private pendingQuestionId: string | null = null;
  private lastValueType: string | null = null;
  private lastCompareValueType: string | null = null;

  operators = [
    { value: '==', label: 'Igual (==)' },
    { value: '!=', label: 'Diferente (!=)' },
    { value: '>', label: 'Maior que (>)' },
    { value: '>=', label: 'Maior ou igual (>=)' },
    { value: '<', label: 'Menor que (<)' },
    { value: '<=', label: 'Menor ou igual (<=)' },
    { value: 'in', label: 'Contido em (in)' },
    { value: 'contains', label: 'Contem (contains)' },
    { value: '&&', label: 'E (&&)' },
    { value: '||', label: 'Ou (||)' }
  ];

  questionTypeOperators: Record<string, string[]> = {
    text: ['==', '!=', '>', '>=', '<', '<=', 'contains'],
    integer: ['==', '!=', '>', '>=', '<', '<='],
    double: ['==', '!=', '>', '>=', '<', '<='],
    boolean: ['==', '!='],
    select: ['==', '!=', 'contains'],
    radio: ['==', '!='],
    checkbox: ['==', '!=', 'contains'],
    date: ['==', '!=', '>', '>=', '<', '<='],
    datetime: ['==', '!=', '>', '>=', '<', '<='],
    image: ['==', '!='],
    score: ['==', '!=', '>', '>=', '<', '<=']
  };

  fixedTypeOperators: string[] = ['==', '!=', '>', '>=', '<', '<=', 'contains'];

  conditionTypeOperators: string[] = ['&&', '||'];

  questionOptions: { id: string; label: string }[] = [];
  private questionOptionMap = new Map<string, { id: string; label: string }>();

  constructor() {
    this.library.addIcons(faTrash);

    this.conditionForm = new FormGroup({
      id: new FormControl(''),
      name: new FormControl(''),
      valueType: new FormControl('fixed'),
      value: new FormControl(''),
      questionId: new FormControl(''),
      questionValueType: new FormControl('value'),
      conditionId: new FormControl(''),
      operator: new FormControl('=='),
      compareValueType: new FormControl('fixed'),
      compareValue: new FormControl(''),
      compareQuestionId: new FormControl(''),
      compareQuestionValueType: new FormControl('value'),
      compareConditionId: new FormControl('')
    });
  }

  ngOnInit() {
    this.conditionForm.patchValue(this.condition);

    this.pendingQuestionId = this.condition?.questionId ?? null;
    this.lastValueType = this.conditionForm.get('valueType')?.value ?? null;
    this.lastCompareValueType = this.conditionForm.get('compareValueType')?.value ?? null;

    this.ensureDistinctQuestionSelections();
    this.updateQuestionOptions();
    this.syncQuestionControlFromCondition();
    this.updateQuestionOptions();

    this.conditionForm.get('questionId')?.valueChanges.subscribe(() => {
      this.ensureDistinctQuestionSelections();
      this.updateQuestionOptions();
    });

    this.conditionForm.get('compareQuestionId')?.valueChanges.subscribe(() => {
      this.ensureDistinctQuestionSelections();
      this.updateQuestionOptions();
    });

    this.conditionForm.get('compareValueType')?.valueChanges.subscribe(value => {
      const previous = this.lastCompareValueType;
      this.lastCompareValueType = value;

      const compareControl = this.conditionForm.get('compareQuestionId');
      if (compareControl) {
        if (value === 'question' && previous !== 'question') {
          if (compareControl.value !== null) {
            compareControl.setValue(null);
          }
        } else if (value !== 'question' && compareControl.value !== null) {
          compareControl.setValue(null);
        }
      }

      this.ensureDistinctQuestionSelections();
      this.updateQuestionOptions();
    });

    this.conditionForm.get('valueType')?.valueChanges.subscribe(value => {
      const previous = this.lastValueType;
      this.lastValueType = value;

      if (value === 'condition') {
        this.conditionForm.get('compareValueType')?.setValue('condition');
      } else if (this.conditionForm.get('compareValueType')?.value === 'condition') {
        this.conditionForm.get('compareValueType')?.setValue('fixed');
      }

      const questionControl = this.conditionForm.get('questionId');
      if (questionControl) {
        if (value === 'question' && previous !== 'question') {
          if (questionControl.value !== null) {
            questionControl.setValue(null);
          }
        } else if (value !== 'question' && questionControl.value !== null) {
          questionControl.setValue(null);
        }
      }

      if (value !== 'question') {
        this.pendingQuestionId = null;
      }

      this.ensureDistinctQuestionSelections();
      this.updateQuestionOptions();
    });

    this.conditionForm.valueChanges.subscribe(value => {
      const normalized: Partial<ComparisonCondition> = {
        ...value,
        questionId: this.extractQuestionId(value.questionId) ?? undefined,
        compareQuestionId: this.extractQuestionId(value.compareQuestionId) ?? undefined
      };

      Object.keys(normalized).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(this.condition, key)) {
          (this.condition as any)[key] = (normalized as any)[key];
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['condition'] && !changes['condition'].firstChange) {
      this.conditionForm.patchValue(this.condition, { emitEvent: false });
      this.pendingQuestionId = this.condition?.questionId ?? null;
    }

    if (changes['availableQuestions']) {
      this.ensureDistinctQuestionSelections();
      this.updateQuestionOptions();
      this.syncQuestionControlFromCondition();
    }

    this.ensureDistinctQuestionSelections();
    this.updateQuestionOptions();
  }

  get availableQuestionsForComparison() {
    const selectedId = this.extractQuestionId(this.conditionForm.get('questionId')?.value);
    return this.availableQuestions.filter(q => {
      if (!selectedId) return true;
      return q.data.id !== selectedId && q.id !== selectedId;
    });
  }

  get selectedQuestionType(): string | undefined {
    const valueType = this.conditionForm.get('valueType')?.value;
    if (valueType !== 'question') return undefined;

    if (this.conditionForm.get('questionValueType')?.value === 'score') return 'score';

    const selectedQuestionId = this.extractQuestionId(this.conditionForm.get('questionId')?.value);
    if (!selectedQuestionId) return undefined;

    const question = this.availableQuestions.find(q => q.data.id === selectedQuestionId || q.id === selectedQuestionId);
    return question ? question.data.type : undefined;
  }

  get filteredOperators() {
    const valueType = this.conditionForm.get('valueType')?.value;

    if (valueType === 'fixed') {
      return this.operators.filter(op => this.fixedTypeOperators.includes(op.value));
    }

    if (valueType === 'question') {
      const questionType = this.selectedQuestionType;
      if (!questionType || !this.questionTypeOperators[questionType]) {
        return [];
      }
      return this.operators.filter(op => this.questionTypeOperators[questionType].includes(op.value));
    }

    if (valueType === 'condition') {
      return this.operators.filter(op => this.conditionTypeOperators.includes(op.value));
    }

    return [];
  }

  private ensureDistinctQuestionSelections(): void {
    const valueType = this.conditionForm.get('valueType')?.value;
    const compareValueType = this.conditionForm.get('compareValueType')?.value;
    const primaryControl = this.conditionForm.get('questionId');
    const compareControl = this.conditionForm.get('compareQuestionId');

    if (!primaryControl || !compareControl) {
      return;
    }

    if (valueType !== 'question' || compareValueType !== 'question') {
      return;
    }

    const primaryId = this.extractQuestionId(primaryControl.value);
    const compareId = this.extractQuestionId(compareControl.value);

    if (primaryId && compareId && primaryId === compareId && compareControl.value !== null) {
      compareControl.setValue(null);
    }
  }

  private updateQuestionOptions(): void {
    const compareId = this.extractQuestionId(this.conditionForm.get('compareQuestionId')?.value);
    const nextOptions: { id: string; label: string }[] = [];
    const nextMap = new Map<string, { id: string; label: string }>();

    for (const question of this.availableQuestions) {
      if (compareId && (question.data.id === compareId || question.id === compareId)) {
        continue;
      }

      const optionId = question.data.id;
      const optionLabel = question.data.label ?? question.data.id;
      const existing = this.questionOptionMap.get(optionId);
      const option = existing && existing.label === optionLabel ? existing : { id: optionId, label: optionLabel };

      nextOptions.push(option);
      nextMap.set(optionId, option);
    }

    this.questionOptions = nextOptions;
    this.questionOptionMap = nextMap;
  }

  private extractQuestionId(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }

    if (typeof value === 'object') {
      if (typeof value.id === 'string' && value.id.trim().length) {
        return value.id.trim();
      }
      if (value.data && typeof value.data.id === 'string' && value.data.id.trim().length) {
        return value.data.id.trim();
      }
    }

    return null;
  }

  private syncQuestionControlFromCondition(): void {
    const control = this.conditionForm.get('questionId');
    if (!control) return;

    const currentId = this.extractQuestionId(control.value);
    const desiredId = currentId ?? this.pendingQuestionId ?? this.condition?.questionId ?? null;

    if (!desiredId) {
      this.pendingQuestionId = null;
      if (control.value !== null) {
        control.setValue(null, { emitEvent: false });
      }
      return;
    }

    const question = this.availableQuestions.find(q => q.data.id === desiredId || q.id === desiredId);
    if (!question) {
      this.pendingQuestionId = desiredId;
      return;
    }

    const option = this.questionOptions.find(opt => opt.id === question.data.id);
    if (!option) {
      this.pendingQuestionId = desiredId;
      return;
    }

    this.pendingQuestionId = null;
    const matchesCurrent = typeof control.value === 'object' && control.value !== null && this.extractQuestionId(control.value) === option.id;
    if (matchesCurrent) {
      return;
    }

    control.setValue(option, { emitEvent: false });
  }
}



