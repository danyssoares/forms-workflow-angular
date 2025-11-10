import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { ControlMaterialComponent, ControlMaterialNumberComponent, ControlMaterialSelectComponent, ControlMaterialDateTimeComponent } from '@angulartoolsdr/control-material';
import { ActivatedRoute } from '@angular/router';
import { WorkflowStorageService, WorkflowSnapshot } from '../../flow/workflow-storage.service';
import { GraphNode, QuestionNodeData } from '../../flow/graph.types';
import { Option } from '../../../shared/models/form-models';

type RunnerQuestion = {
  nodeId: string;
  questionId: string;
  label: string;
  seq: number;
  typeId: number;
  helpText?: string;
  trueLabel?: string;
  falseLabel?: string;
  options?: Option[];
  required?: boolean;
};

@Component({
  selector: 'app-run-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    MatChipsModule,
    MatDividerModule,
    ControlMaterialComponent,
    ControlMaterialNumberComponent,
    ControlMaterialSelectComponent,
    ControlMaterialDateTimeComponent,
    MatListModule
  ],
  templateUrl: './run-form.component.html',
  styleUrl: './run-form.component.scss'
})
export class RunFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(WorkflowStorageService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly completed = signal(false);
  readonly workflowName = signal<string>('Simulação do Formulário');
  readonly questions = signal<RunnerQuestion[]>([]);
  readonly currentIndex = signal(0);
  readonly answers = signal<Record<string, any>>({});

  readonly currentQuestion = computed(() => {
    const all = this.questions();
    const idx = this.currentIndex();
    return all[idx] ?? null;
  });

  readonly progress = computed(() => {
    if (this.completed()) return 100;
    const total = this.questions().length;
    if (!total) return 0;
    return Math.round((this.currentIndex() / total) * 100);
  });

  readonly form: FormGroup = this.fb.group({});

  ngOnInit(): void {
    this.initializeFromStorage();
  }

  goPrevious(): void {
    const idx = this.currentIndex();
    if (idx === 0) return;
    this.currentIndex.set(idx - 1);
  }

  goNext(): void {
    const question = this.currentQuestion();
    if (!question) return;
    const control = this.form.get(question.questionId);
    if (control && control.invalid) {
      control.markAsTouched();
      control.markAsDirty();
      return;
    }
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.questions().length) {
      this.finish();
      return;
    }
    this.currentIndex.set(nextIndex);
  }

  finish(): void {
    const allQuestions = this.questions();
    if (!allQuestions.length) return;

    const invalidIndex = allQuestions.findIndex(q => {
      const control = this.form.get(q.questionId);
      if (!control) return false;
      if (control.invalid) {
        control.markAsTouched();
        control.markAsDirty();
        return true;
      }
      return false;
    });

    if (invalidIndex >= 0) {
      this.currentIndex.set(invalidIndex);
      return;
    }

    const captured: Record<string, any> = {};
    allQuestions.forEach(q => {
      captured[q.questionId] = this.form.get(q.questionId)?.value;
    });
    this.answers.set(captured);
    this.completed.set(true);
  }

  restart(): void {
    this.questions().forEach(question => {
      const control = this.form.get(question.questionId);
      if (!control) return;
      control.reset(this.defaultValueFor(question));
      control.markAsPristine();
      control.markAsUntouched();
    });
    this.currentIndex.set(0);
    this.completed.set(false);
    this.answers.set({});
  }

  trackOption(_: number, opt: Option): string | number | boolean {
    return opt?.value ?? opt?.label;
  }

  trackQuestion(_: number, question: RunnerQuestion): string {
    return question.questionId;
  }

  displayAnswer(question: RunnerQuestion): string | string[] {
    const value = this.answers()[question.questionId];

    if (question.typeId === 10 && Array.isArray(value)) {
      return value.map(v => this.optionLabel(question, v));
    }

    if (question.typeId === 5) {
      if (value === true) return question.trueLabel || 'Sim';
      if (value === false) return question.falseLabel || 'Não';
      return '—';
    }

    if ([8, 9].includes(question.typeId)) {
      return this.optionLabel(question, value);
    }

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  isArrayAnswer(value: string | string[]): value is string[] {
    return Array.isArray(value);
  }

  private initializeFromStorage(): void {
    let snapshot: WorkflowSnapshot | null = null;
    try {
      const workflowParam = this.route.snapshot.queryParamMap.get('workflow');
      if (workflowParam) {
        snapshot = this.storage.loadWorkflow(workflowParam);
        if (!snapshot) {
          this.error.set('Workflow selecionado não foi encontrado. Salve-o novamente no designer.');
          this.loading.set(false);
          return;
        }
      } else {
        snapshot = this.storage.loadLastWorkflow();
      }
    } catch (err) {
      console.error('Failed to load workflow snapshot', err);
      this.error.set('Não foi possível carregar o fluxo configurado.');
      this.loading.set(false);
      return;
    }

    if (!snapshot) {
      this.error.set('Salve um workflow no designer para iniciar a simulação.');
      this.loading.set(false);
      return;
    }

    this.workflowName.set(snapshot.formName || snapshot.name || 'Simulação do Formulário');

    const questionNodes = snapshot.graph.nodes
      .filter(n => n.kind === 'question') as GraphNode<QuestionNodeData>[];

    if (!questionNodes.length) {
      this.error.set('Nenhuma pergunta encontrada no fluxo salvo.');
      this.loading.set(false);
      return;
    }

    const steps = questionNodes
      .map(node => this.toRunnerQuestion(node))
      .sort((a, b) => a.seq - b.seq);

    steps.forEach(step => {
      const validator = step.required ? this.resolveValidator(step) : null;
      const control = new FormControl(this.defaultValueFor(step), validator ? [validator] : []);
      this.form.addControl(step.questionId, control);
    });

    this.questions.set(steps);
    this.loading.set(false);
  }

  private toRunnerQuestion(node: GraphNode<QuestionNodeData>): RunnerQuestion {
    const data = node.data as any;
    const typeId = Number(data?.type?.id ?? 0);
    const seq = Number(data?.seq ?? 0);
    const options = Array.isArray(data?.options) ? data.options as Option[] : undefined;

    return {
      nodeId: node.id,
      questionId: data?.id ?? node.id,
      label: data?.label ?? 'Pergunta',
      seq: Number.isFinite(seq) ? seq : 0,
      typeId,
      helpText: data?.helpText,
      trueLabel: data?.trueLabel,
      falseLabel: data?.falseLabel,
      options,
      required: !!data?.required
    };
  }

  private defaultValueFor(question: RunnerQuestion): any {
    switch (question.typeId) {
      case 1:
        return null;
      case 2:
      case 3:
      case 4:
        return '';
      case 5:
        return null;
      case 8:
      case 9:
        return null;
      case 10:
        return [];
      default:
        return '';
    }
  }

  private resolveValidator(question: RunnerQuestion): (control: AbstractControl) => ValidationErrors | null {
    switch (question.typeId) {
      case 5:
        return this.booleanRequiredValidator;
      case 10:
        return this.arrayRequiredValidator;
      default:
        return Validators.required;
    }
  }

  private booleanRequiredValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return value === null || value === undefined ? { required: true } : null;
  }

  private arrayRequiredValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return Array.isArray(value) && value.length ? null : { required: true };
  }

  private optionLabel(question: RunnerQuestion, value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    const found = question.options?.find(opt => opt.value === value);
    return found?.label ?? String(value);
  }
}
