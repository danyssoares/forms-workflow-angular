import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { SingleCondition, QuestionNodeData, GraphNode } from '../../graph.types';

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
    FontAwesomeModule
  ],
  template: `
    <div class="condition-editor" [formGroup]="conditionForm">
      <div class="condition-header">
        <h4>Condição {{ index + 1 }}</h4>
        <button mat-icon-button type="button" (click)="remove.emit()" *ngIf="index > 0">
          <fa-icon [icon]="faTrash"></fa-icon>
        </button>
      </div>
      
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name">
      </mat-form-field>
      
      <div class="value-section">
        <h5>Primeiro Valor</h5>
        <div class="value-toggle">
          <mat-button-toggle-group formControlName="valueType" aria-label="Valor ou Pergunta">
            <mat-button-toggle value="fixed">Valor Fixo</mat-button-toggle>
            <mat-button-toggle value="question">Pergunta</mat-button-toggle>
            <mat-button-toggle value="score">Score da Pergunta</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <mat-form-field appearance="outline" style="width:100%" *ngIf="conditionForm.get('valueType')?.value === 'fixed'">
          <mat-label>Valor</mat-label>
          <input matInput formControlName="value">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%" *ngIf="conditionForm.get('valueType')?.value === 'question' || conditionForm.get('valueType')?.value === 'score'">
          <mat-label>Pergunta</mat-label>
          <mat-select formControlName="questionId">
            <mat-option *ngFor="let question of availableQuestions" [value]="question.data.id">
              {{ question.data.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Operador</mat-label>
        <mat-select formControlName="operator">
          <mat-option *ngFor="let op of filteredOperators" [value]="op.value">
            {{ op.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      
      <div class="compare-value-section">
        <h5>Segundo Valor</h5>
        <div class="value-toggle">
          <mat-button-toggle-group formControlName="compareValueType" aria-label="Valor ou Pergunta">
            <mat-button-toggle value="fixed">Valor Fixo</mat-button-toggle>
            <mat-button-toggle value="question">Pergunta</mat-button-toggle>
            <mat-button-toggle value="score">Score da Pergunta</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <mat-form-field appearance="outline" style="width:100%" *ngIf="conditionForm.get('compareValueType')?.value === 'fixed'">
          <mat-label>Valor</mat-label>
          <input matInput formControlName="compareValue">
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%" *ngIf="conditionForm.get('compareValueType')?.value === 'question' || conditionForm.get('compareValueType')?.value === 'score'">
          <mat-label>Pergunta</mat-label>
          <mat-select formControlName="compareQuestionId">
            <mat-option *ngFor="let question of availableQuestionsForComparison" [value]="question.data.id">
              {{ question.data.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>
  `,
  styleUrl: './condition-editor.component.scss'
})
export class ConditionEditorComponent implements OnInit {
  @Input() condition!: SingleCondition;
  @Input() index!: number;
  @Input() availableQuestions: GraphNode<QuestionNodeData>[] = [];
  @Output() remove = new EventEmitter<void>();
  
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
    { value: 'contains', label: 'Contém (contains)' }
  ];

  questionTypeOperators: Record<string, string[]> = {
    'text': ['==', '!=', 'contains'],
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
  
  constructor() {
    this.conditionForm = new FormGroup({
      id: new FormControl(''),
      name: new FormControl(''),
      valueType: new FormControl('fixed'),
      value: new FormControl(''),
      questionId: new FormControl(''),
      operator: new FormControl('=='),
      compareValueType: new FormControl('fixed'),
      compareValue: new FormControl(''),
      compareQuestionId: new FormControl('')
    });
  }
  
  ngOnInit() {
    this.conditionForm.patchValue(this.condition);
    
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
    // Filter out the question selected in questionId for comparison
    const selectedQuestionId = this.conditionForm.get('questionId')?.value;
    return this.availableQuestions.filter(q => q.data.id !== selectedQuestionId);
  }

  get selectedQuestionType(): string | undefined {
    const valueType = this.conditionForm.get('valueType')?.value;
    if (valueType === 'score') return 'score';

    const selectedQuestionId = this.conditionForm.get('questionId')?.value;
    if (!selectedQuestionId) return undefined;

    const question = this.availableQuestions.find(q => q.data.id === selectedQuestionId);
    return question ? question.data.type : undefined;
  }

  get filteredOperators() {
    const questionType = this.selectedQuestionType;
    if (!questionType || !this.questionTypeOperators[questionType]) {
      return this.operators;
    }
    
    return this.operators.filter(op => 
      this.questionTypeOperators[questionType].includes(op.value)
    );
  }
}