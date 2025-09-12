import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
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
  templateUrl: './expression-condition-editor.component.html',
  styleUrl: '../condition-editor/condition-editor.component.scss'
})
export class ExpressionConditionEditorComponent implements OnInit {
  @Input() condition!: ExpressionCondition;
  @Input() index!: number;
  @Output() remove = new EventEmitter<void>();

  library = inject(FaIconLibrary);

  faTrash = faTrash;
  formGroup: FormGroup;

  ngOnInit() {
    this.formGroup.patchValue({
      name: this.condition.name || '',
      expressionControl: this.condition.expression || ''
    });

    this.formGroup.valueChanges.subscribe(value => {
      this.condition.name = value.name || '';
      this.condition.expression = value.expressionControl || '';
    });
  }

  constructor(private formBuilder: FormBuilder) {
    this.formGroup = this.formBuilder.group({
      name: [''],
      expressionControl: ['']
    });
    this.library.addIcons(faTrash);
  }
}
