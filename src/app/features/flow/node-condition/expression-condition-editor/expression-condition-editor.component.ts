import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ExpressionCondition } from '../../graph.types';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-expression-condition-editor',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FontAwesomeModule
  ],
  template: `
    <div class="condition-editor">
      <div class="condition-header">
        <h4>Condição {{ index + 1 }}</h4>
        <button mat-icon-button type="button" (click)="remove.emit()" *ngIf="index > 0">
          <fa-icon [icon]="faTrash"></fa-icon>
        </button>
      </div>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Expressão</mat-label>
        <input matInput [formControl]="expressionControl">
      </mat-form-field>
    </div>
  `,
  styleUrl: '../condition-editor/condition-editor.component.scss'
})
export class ExpressionConditionEditorComponent implements OnInit {
  @Input() condition!: ExpressionCondition;
  @Input() index!: number;
  @Output() remove = new EventEmitter<void>();

  faTrash = faTrash;
  expressionControl = new FormControl('');

  ngOnInit() {
    this.expressionControl.setValue(this.condition.expression);
    this.expressionControl.valueChanges.subscribe(value => {
      this.condition.expression = value || '';
    });
  }
}
