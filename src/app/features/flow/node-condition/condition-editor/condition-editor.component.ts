import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
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
import { ControlMaterialComponent } from '@angulartoolsdr/control-material';

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
    //ControlMaterialSelectComponent
  ],
  templateUrl: './condition-editor.component.html',
  styleUrl: './condition-editor.component.scss'
})
export class ConditionEditorComponent implements OnInit {
  @Input() condition!: ComparisonCondition;
  @Input() index!: number;
  @Input() availableQuestions: GraphNode<QuestionNodeData>[] = [];
  @Input() availableConditions: Condition[] = [];
  @Output() remove = new EventEmitter<void>();

  library = inject(FaIconLibrary);
  
  faTrash = faTrash;
  
  conditionForm: FormGroup;
  
  operators = [
    { value: '==', label: 'Igual (==)' },
    { value: '!=', label: 'Diferente (!=)' },
    { value: '>', label: 'Maior que (>)' },
    { value: '>=', label: 'Maior ou igual (>=)' },
    { value: '<', label: 'Menor que (<)' },
    { value: '<=', label: 'Menor ou igual (<=)' },
    { value: 'in', label: 'Contido em (in)' },
    { value: 'contains', label: 'Contém (contains)' },
    { value: '&&', label: 'E (&&)' },
    { value: '||', label: 'Ou (||)' }
  ];

  questionTypeOperators: Record<string, string[]> = {
    'text': ['==', '!=', '>', '>=', '<', '<=', 'contains'],
    'integer': ['==', '!=', '>', '>=', '<', '<='],
    'double': ['==', '!=', '>', '>=', '<', '<='],
    'boolean': ['==', '!='],
    'select': ['==', '!=', 'contains'],
    'radio': ['==', '!='],
    'checkbox': ['==', '!=', 'contains'],
    'date': ['==', '!=', '>', '>=', '<', '<='],
    'datetime': ['==', '!=', '>', '>=', '<', '<='],
    'image': ['==', '!='],
    'score': ['==', '!=', '>', '>=', '<', '<=']
  };

  fixedTypeOperators: string[] = ['==', '!=', '>', '>=', '<', '<=', 'contains'];

  conditionTypeOperators: string[] = ['&&', '||'];    
  
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

    this.conditionForm.get('valueType')?.valueChanges.subscribe(v => {
      if (v === 'condition') {
        this.conditionForm.get('compareValueType')?.setValue('condition');
      } else if (this.conditionForm.get('compareValueType')?.value === 'condition') {
        this.conditionForm.get('compareValueType')?.setValue('fixed');
      }
    });

    // Update parent condition when form changes
    this.conditionForm.valueChanges.subscribe(value => {
      // Update only the specific fields that have changed
      Object.keys(value).forEach(key => {
        if (this.condition.hasOwnProperty(key)) {
          (this.condition as any)[key] = value[key];
        }
      });
    });
  }
  
  get availableQuestionsForComparison() {
    const selectedId = this.conditionForm.get('questionId')?.value;
    const selected = this.availableQuestions.find(
      q => q.data.id === selectedId || q.id === selectedId
    );
    return this.availableQuestions.filter(q => q !== selected);
  }

  get selectedQuestionType(): string | undefined {
    const valueType = this.conditionForm.get('valueType')?.value;
    if (valueType !== 'question') return undefined;

    if (this.conditionForm.get('questionValueType')?.value === 'score') return 'score';

    const selectedQuestionId = this.conditionForm.get('questionId')?.value;
    if (!selectedQuestionId) return undefined;

    const question = this.availableQuestions.find(q => q.data.id === selectedQuestionId);
    return question ? question.data.type : undefined;
  }

  get filteredOperators() {
    const valueType = this.conditionForm.get('valueType')?.value;

    if (valueType === 'fixed') {
      return this.operators.filter(op => 
        this.fixedTypeOperators.includes(op.value)
      );
    } else if (valueType === 'question') {
      const questionType = this.selectedQuestionType;
      console.log(questionType);
      if (!questionType || !this.questionTypeOperators[questionType]) {
        return this.operators;
      }
      
      return this.operators.filter(op => 
        this.questionTypeOperators[questionType].includes(op.value)
      );
    } else if (valueType === 'condition') {
      return this.operators.filter(op => 
        this.conditionTypeOperators.includes(op.value)
      );
    }
    return [];
  }
}