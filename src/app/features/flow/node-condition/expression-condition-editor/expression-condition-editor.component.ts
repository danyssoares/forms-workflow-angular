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

  get expressionControl(): FormControl {
    return this.formGroup.get('expressionControl') as FormControl;
  }

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

  validate(context: Record<string, any>): boolean {
    const ctrl = this.expressionControl;
    const expr: string = (ctrl.value || '').trim();
    if (!expr) {
      ctrl.setErrors({ expression: 'Expressão vazia' });
      ctrl.markAsTouched();
      return false;
    }

    const varRegex = /\$([a-zA-Z_][\w]*)(\.[a-zA-Z_][\w]*)*/g;
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(expr)) !== null) {
      const varName = match[1];
      const path = match[2] ? match[2].slice(1).split('.') : [];
      if (!(varName in context)) {
        ctrl.setErrors({ expression: `Variável ${varName} não disponível` });
        ctrl.markAsTouched();
        return false;
      }
      let ref: any = context[varName];
      for (const segment of path) {
        if (ref && typeof ref === 'object' && segment in ref) {
          ref = ref[segment];
        } else {
          ctrl.setErrors({ expression: `Propriedade ${segment} não existe em ${varName}` });
          ctrl.markAsTouched();
          return false;
        }
      }
    }
    try {
      const processed = expr.replace(varRegex, (_: string, v: string, prop: string) => {
        let res = `context['${v}']`;
        if (prop) res += prop;
        return res;
      });
      // eslint-disable-next-line no-new-func
      const result = new Function('context', `return (${processed});`)(context);
      if (typeof result !== 'boolean') {
        ctrl.setErrors({ expression: 'Expressão deve retornar booleano' });
        ctrl.markAsTouched();
        return false;
      }
      ctrl.setErrors(null);
      return true;
    } catch (err: any) {
      ctrl.setErrors({ expression: err.message || 'Expressão inválida' });
      ctrl.markAsTouched();
      return false;
    }
  }
}
