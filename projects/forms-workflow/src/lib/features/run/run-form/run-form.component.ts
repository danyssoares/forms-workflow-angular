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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { ControlMaterialTimeComponent, ControlMaterialComponent, ControlMaterialNumberComponent, ControlMaterialSelectComponent, ControlMaterialDateTimeComponent, ControlMaterialRadioComponent, ControlMaterialFileComponent } from '@angulartoolsdr/control-material';
import { ActivatedRoute } from '@angular/router';
import { WorkflowStorageService, WorkflowSnapshot } from '../../flow/workflow-storage.service';
import { ConditionNodeData, GraphModel, GraphNode, QuestionNodeData, ComparisonCondition } from '../../flow/graph.types';
import { Option, Question } from '../../../shared/models/form-models';
import { TranslationPipe, TranslationService } from '@angulartoolsdr/translation';
import { ScoreService } from '../../../shared/score.service';

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
    ControlMaterialTimeComponent,
    ControlMaterialRadioComponent,
    ControlMaterialSelectComponent,
    ControlMaterialFileComponent,
    MatCheckboxModule,
    TranslationPipe
  ],
  templateUrl: './run-form.component.html',
  styleUrl: './run-form.component.scss'
})
export class RunFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(WorkflowStorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly translation = inject(TranslationService);
  private readonly scoreService = inject(ScoreService);

  private graph: GraphModel | null = null;
  private nodeIndex = new Map<string, GraphNode>();
  private questionDefinitions = new Map<string, Question>();
  private questionTypeIds = new Map<string, number>();
  private conditionResults = new Map<string, boolean>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly completed = signal(false);
  readonly workflowName = signal<string>('Simulação do Formulário');
  readonly questions = signal<RunnerQuestion[]>([]);
  readonly currentIndex = signal(0);
  readonly answers = signal<Record<string, any>>({});
  readonly visitedQuestionIds = signal<Set<string>>(new Set());

  readonly summaryQuestions = computed(() => {
    const visited = this.visitedQuestionIds();
    return this.questions().filter(question => visited.has(question.questionId));
  });

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

  arquivo: any = undefined;
  arquivoImagem: any = undefined;

  selectedFile($event: any) {
    this.arquivo = $event.target.files;
  }

  selectedImageFile($event: any) { 
    this.arquivoImagem = $event.target.files;
  }

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

    if (control) {
      this.answers.set({ ...this.answers(), [question.questionId]: control.value });
    }

    const branchedNext = this.resolveNextQuestionId(question);
    if (branchedNext) {
      const targetIndex = this.questions().findIndex(q => q.questionId === branchedNext);
      if (targetIndex >= 0) {
        this.currentIndex.set(targetIndex);
        this.markQuestionVisited(branchedNext);
        return;
      }
    }

    const hasGraphEdges = this.graph?.edges.some(e => e.from === question.nodeId) ?? false;
    if (hasGraphEdges) {
      this.completed.set(true);
      return;
    }

    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.questions().length) {
      this.finish();
      return;
    }
    this.currentIndex.set(nextIndex);
    this.markQuestionVisited(this.questions()[nextIndex]?.questionId);
  }

  finish(): void {
    const visitedIds = this.visitedQuestionIds();
    const visitedQuestions = this.questions().filter(question => visitedIds.has(question.questionId));
    if (!visitedQuestions.length) return;

    const invalidIndex = visitedQuestions.findIndex(q => {
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
      const invalidQuestion = visitedQuestions[invalidIndex];
      const originalIndex = this.questions().findIndex(q => q.questionId === invalidQuestion.questionId);
      this.currentIndex.set(originalIndex >= 0 ? originalIndex : invalidIndex);
      return;
    }

    const captured: Record<string, any> = {};
    visitedQuestions.forEach(q => {
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
    this.conditionResults.clear();
    const firstQuestion = this.questions()[0];
    this.visitedQuestionIds.set(firstQuestion ? new Set([firstQuestion.questionId]) : new Set());
  }

  trackOption(_: number, opt: Option): string | number | boolean {
    return opt?.value ?? opt?.label;
  }

  trackQuestion(_: number, question: RunnerQuestion): string {
    return question.questionId;
  }

  isOptionSelected(questionId: string, value: any): boolean {
    const control = this.form.get(questionId);
    if (!control) return false;
    const current = control.value;
    if (!Array.isArray(current)) return false;
    return current.some(item => item === value);
  }

  toggleMultiOption(questionId: string, value: any, checked: boolean): void {
    const control = this.form.get(questionId);
    if (!control) return;
    const current = Array.isArray(control.value) ? [...control.value] : [];
    const index = current.findIndex(item => item === value);
    if (checked && index === -1) {
      current.push(value);
    } else if (!checked && index !== -1) {
      current.splice(index, 1);
    }
    control.setValue(current);
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  displayAnswer(question: RunnerQuestion): string | string[] {
    const value = this.answers()[question.questionId];

    if ([6, 7].includes(question.typeId)) {
      return this.formatFileAnswer(value);
    }

    if ([2, 3, 4].includes(question.typeId)) {
      return this.formatTemporalAnswer(value, question.typeId);
    }

    if (question.typeId === 10 && Array.isArray(value)) {
      return value.map(v => this.optionLabel(question, v));
    }

    if (question.typeId === 5) {
      const normalized = this.normalizeBooleanAnswer(question.questionId, value);
      if (normalized === true) return question.trueLabel || 'Sim';
      if (normalized === false) return question.falseLabel || 'Não';
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

    this.graph = snapshot.graph;
    this.nodeIndex = new Map(snapshot.graph.nodes.map(n => [n.id, n]));
    this.questionDefinitions.clear();
    this.questionTypeIds.clear();
    this.conditionResults.clear();
    this.answers.set({});

    const questionNodes = snapshot.graph.nodes
      .filter(n => n.kind === 'question') as GraphNode<QuestionNodeData>[];

    if (!questionNodes.length) {
      this.error.set('Nenhuma pergunta encontrada no fluxo salvo.');
      this.loading.set(false);
      return;
    }

    const steps = questionNodes
      .map(node => {
        const runner = this.toRunnerQuestion(node);
        this.questionDefinitions.set(runner.questionId, this.toQuestionDefinition(node));
        this.questionTypeIds.set(runner.questionId, runner.typeId);
        return runner;
      })
      .sort((a, b) => a.seq - b.seq);

    steps.forEach(step => {
      const validator = step.required ? this.resolveValidator(step) : null;
      const control = new FormControl(this.defaultValueFor(step), validator ? [validator] : []);
      this.form.addControl(step.questionId, control);
    });

    this.questions.set(steps);
    this.loading.set(false);
    const firstQuestion = steps[0];
    this.markQuestionVisited(firstQuestion?.questionId);
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

    const labelFromValue = this.extractOptionLabel(value);
    if (labelFromValue) {
      return labelFromValue;
    }

    const comparableValue = this.extractComparableOptionValue(value);
    if (comparableValue !== undefined && comparableValue !== null && comparableValue !== '') {
      const found = question.options?.find(opt => opt.value === comparableValue);
      if (found?.label) {
        return found.label;
      }
      if (typeof comparableValue === 'string' || typeof comparableValue === 'number' || typeof comparableValue === 'boolean') {
        return String(comparableValue);
      }
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '—';
  }

  private extractOptionLabel(value: any): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidateKeys = ['label', 'nome', 'text', 'description', 'title'];
    for (const key of candidateKeys) {
      const candidate = (value as Record<string, any>)[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private extractComparableOptionValue(value: any): string | number | boolean | null | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== 'object') {
      return value;
    }

    const candidateKeys = ['value', 'id', 'key'];
    for (const key of candidateKeys) {
      const candidate = (value as Record<string, any>)[key];
      if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
        return candidate;
      }
    }

    return undefined;
  }

  private normalizeOptionAnswer(value: any): string | string[] | null {
    if (Array.isArray(value)) {
      const mapped = value
        .map(item => this.extractComparableOptionValue(item))
        .filter((item): item is string | number | boolean => item !== undefined && item !== null)
        .map(item => String(item));
      return mapped;
    }

    const comparable = this.extractComparableOptionValue(value);
    if (comparable === undefined || comparable === null) {
      return null;
    }

    return String(comparable);
  }

  private formatTemporalAnswer(value: any, typeId: number): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    try {
      const locale = this.resolveLocale();
      const date = this.parseTemporalValue(value, typeId);
      if (!date) return String(value);
      const options: Intl.DateTimeFormatOptions =
        typeId === 2
          ? { dateStyle: 'short' }
          : typeId === 3
            ? { timeStyle: 'short' }
            : { dateStyle: 'short', timeStyle: 'short' };
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch {
      return String(value);
    }
  }

  private resolveLocale(): string {
    const lang = (this.translation.currentLang || '').trim();
    if (lang) return lang;
    try {
      const browser = this.translation.getBrowserLang?.();
      if (browser) return browser;
    } catch {
      // ignore
    }
    return 'pt-BR';
  }

  private parseTemporalValue(value: any, typeId: number): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      if (typeId === 2 && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        return new Date(y, m - 1, d);
      }

      if (typeId === 3 && /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        const [h, min = '00', sec = '00'] = trimmed.split(':');
        return new Date(1970, 0, 1, Number(h), Number(min), Number(sec));
      }

      if (typeId === 4 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
        const [datePart, timePart] = trimmed.split('T');
        const [y, m, d] = datePart.split('-').map(Number);
        const [h, minuteSec] = timePart.split(':');
        const minute = Number(minuteSec.slice(0, 2));
        const seconds = minuteSec.length > 2 ? Number(minuteSec.slice(3, 5)) : 0;
        return new Date(y, m - 1, d, Number(h), minute, seconds);
      }

      const fallback = new Date(trimmed);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    } catch {
      return null;
    }
  }

  private formatFileAnswer(value: any): string {
    const names = this.extractFileNames(value);
    if (names.length) {
      return names.join(', ');
    }

    const fallback = this.extractFallbackFileName(value);
    return fallback ?? '—';
  }

  private extractFileNames(value: any): string[] {
    if (!value) return [];

    if (typeof value === 'string') {
      const fromPath = this.extractNameFromPath(value);
      return fromPath ? [fromPath] : [];
    }

    if (this.hasFilesCollection(value)) {
      const names = this.filesToNames(value.files);
      if (names.length) return names;
    }

    if (this.isFileList(value)) {
      const names = this.filesToNames(value);
      if (names.length) return names;
    }

    if (Array.isArray(value)) {
      const names = this.filesToNames(value);
      if (names.length) return names;
    }

    const singleName = this.normalizeFileName(value);
    return singleName ? [singleName] : [];
  }

  private extractFallbackFileName(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'string') {
      return this.extractNameFromPath(value);
    }

    const candidates = [value.fileNames, value._fileNames, value.name, value.filename];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (typeof value.path === 'string') {
      return this.extractNameFromPath(value.path);
    }

    return null;
  }

  private filesToNames(files: any): string[] {
    return this.normalizeFilesArray(files)
      .map(file => this.normalizeFileName(file))
      .filter((name): name is string => !!name);
  }

  private normalizeFilesArray(files: any): any[] {
    if (!files) return [];
    if (Array.isArray(files)) {
      return files;
    }
    if (this.isFileList(files)) {
      return Array.from(files);
    }
    return [];
  }

  private normalizeFileName(file: any): string | null {
    if (!file) return null;

    if (typeof file === 'string') {
      return this.extractNameFromPath(file);
    }

    if (this.isBrowserFile(file) && typeof file.name === 'string' && file.name.trim()) {
      return file.name.trim();
    }

    if (typeof file.name === 'string' && file.name.trim()) {
      return file.name.trim();
    }

    if (typeof file.filename === 'string' && file.filename.trim()) {
      return file.filename.trim();
    }

    if (typeof file.path === 'string') {
      return this.extractNameFromPath(file.path);
    }

    return null;
  }

  private extractNameFromPath(source: string): string | null {
    const trimmed = source?.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:')) return null;

    const parts = trimmed.split(/[/\\]/).filter(Boolean);
    if (!parts.length) return null;

    const last = parts[parts.length - 1].trim();
    return last || null;
  }

  private hasFilesCollection(value: any): value is { files: any } {
    return value && typeof value === 'object' && 'files' in value && value.files;
  }

  private isFileList(value: any): value is FileList {
    return !!value && typeof value === 'object' && typeof (value as FileList).length === 'number' && typeof (value as FileList).item === 'function';
  }

  private isBrowserFile(entry: any): entry is File {
    return typeof File !== 'undefined' && entry instanceof File;
  }

  private resolveNextQuestionId(question: RunnerQuestion): string | null {
    if (!this.graph) return null;
    const visitedConditions = new Set<string>();
    return this.followFromNode(question.nodeId, visitedConditions);
  }

  private followFromNode(nodeId: string, visitedConditions: Set<string>): string | null {
    const graph = this.graph;
    if (!graph) return null;
    const outgoing = graph.edges.filter(e => e.from === nodeId);
    for (const edge of outgoing) {
      const target = this.nodeIndex.get(edge.to);
      if (!target) continue;
      if (target.kind === 'question') return (target.data as any)?.id ?? target.id;
      if (target.kind === 'condition') {
        const resolved = this.evaluateConditionNode(target as GraphNode<ConditionNodeData>, visitedConditions);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  private evaluateConditionNode(node: GraphNode<ConditionNodeData>, visitedConditions: Set<string>): string | null {
    if (visitedConditions.has(node.id)) return null;
    visitedConditions.add(node.id);

    if (node.data.conditionType !== 'comparison') return null;

    for (const rawCondition of node.data.conditions || []) {
      const comparison = rawCondition as ComparisonCondition;
      if (comparison.type !== 'comparison') continue;

      const result = this.isComparisonTrue(comparison);
      this.conditionResults.set(comparison.id, result);

      if (result) {
        const targetEdge = (this.graph?.edges || []).find(e => e.from === node.id && e.conditionId === comparison.id);
        if (targetEdge) {
          const target = this.nodeIndex.get(targetEdge.to);
          if (target?.kind === 'question') return (target.data as any)?.id ?? target.id;
          if (target?.kind === 'condition') return this.evaluateConditionNode(target as GraphNode<ConditionNodeData>, visitedConditions);
        }
      }
    }

    const fallbackEdge = (this.graph?.edges || []).find(e => e.from === node.id && !e.conditionId);
    if (fallbackEdge) {
      const target = this.nodeIndex.get(fallbackEdge.to);
      if (target?.kind === 'question') return (target.data as any)?.id ?? target.id;
      if (target?.kind === 'condition') return this.evaluateConditionNode(target as GraphNode<ConditionNodeData>, visitedConditions);
    }

    return null;
  }

  private isComparisonTrue(condition: ComparisonCondition): boolean {
    const operator = condition.operator || '==';
    const left = this.resolveComparisonTerm(condition, 'left');
    const right = this.resolveComparisonTerm(condition, 'right');

    switch (operator) {
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return this.toNumber(left) > this.toNumber(right);
      case '>=':
        return this.toNumber(left) >= this.toNumber(right);
      case '<':
        return this.toNumber(left) < this.toNumber(right);
      case '<=':
        return this.toNumber(left) <= this.toNumber(right);
      case 'in':
        return Array.isArray(right) && right.some(item => item == left);
      case 'contains':
        return Array.isArray(left) && left.some(item => item == right);
      case '&&':
        return Boolean(left) && Boolean(right);
      case '||':
        return Boolean(left) || Boolean(right);
      default:
        return false;
    }
  }

  private resolveComparisonTerm(condition: ComparisonCondition, side: 'left' | 'right'): any {
    const valueType = side === 'left' ? condition.valueType : condition.compareValueType;
    if (valueType === 'fixed') {
      return side === 'left' ? condition.value : condition.compareValue;
    }

    if (valueType === 'question') {
      const id = side === 'left' ? condition.questionId : condition.compareQuestionId;
      if (!id) return undefined;
      const useScore = side === 'left'
        ? condition.questionValueType === 'score'
        : condition.compareQuestionValueType === 'score';

      return this.resolveQuestionValue(id, useScore);
    }

    if (valueType === 'condition') {
      const condId = side === 'left' ? condition.conditionId : condition.compareConditionId;
      if (!condId) return undefined;
      return this.conditionResults.get(condId);
    }

    return undefined;
  }

  private resolveQuestionValue(questionId: string, useScore: boolean): any {
    const controlValue = this.form.get(questionId)?.value;
    const storedAnswer = this.answers()[questionId];
    const value = controlValue !== undefined ? controlValue : storedAnswer;

    if (!useScore) {
      const typeId = this.questionTypeIds.get(questionId);
      if (typeId === 5) {
        return this.normalizeBooleanAnswer(questionId, value);
      }
      if (typeId !== undefined && [8, 9, 10].includes(typeId)) {
        const normalized = this.normalizeOptionAnswer(value);
        return normalized ?? value;
      }
      return value;
    }

    const definition = this.questionDefinitions.get(questionId);
    if (!definition) return undefined;
    return this.scoreService.scoreForQuestion(definition, value);
  }

  private normalizeBooleanAnswer(questionId: string, value: any): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const normalized = trimmed.toLowerCase();
      const truthyMatches = ['true', '1', 'sim', 'yes', 'verdadeiro'];
      const falsyMatches = ['false', '0', 'nao', 'não', 'no', 'falso'];

      if (truthyMatches.includes(normalized)) return true;
      if (falsyMatches.includes(normalized)) return false;

      const question = this.questionDefinitions.get(questionId);
      const trueLabel = question?.trueLabel?.trim().toLowerCase();
      const falseLabel = question?.falseLabel?.trim().toLowerCase();
      if (trueLabel && normalized === trueLabel) return true;
      if (falseLabel && normalized === falseLabel) return false;
    }

    if (typeof value === 'object') {
      if (value && 'value' in value) {
        return this.normalizeBooleanAnswer(questionId, (value as any).value);
      }
      if (value && 'label' in value) {
        const normalized = String((value as any).label || '').trim().toLowerCase();
        if (normalized) {
          const question = this.questionDefinitions.get(questionId);
          const trueLabel = question?.trueLabel?.trim().toLowerCase();
          const falseLabel = question?.falseLabel?.trim().toLowerCase();
          if (trueLabel && normalized === trueLabel) return true;
          if (falseLabel && normalized === falseLabel) return false;
        }
      }
    }

    return Boolean(value);
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') return NaN;
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }

  private toQuestionDefinition(node: GraphNode<QuestionNodeData>): Question {
    const data = node.data as any;
    const question: Question = {
      id: data?.id ?? node.id,
      label: data?.label ?? '',
      type: data?.type as any,
      required: !!data?.required,
      options: data?.options,
      trueLabel: data?.trueLabel,
      falseLabel: data?.falseLabel,
      weight: data?.score,
    } as Question;

    const typeId = Number(data?.type?.id ?? data?.typeId ?? 0);
    if ([8, 9, 10].includes(typeId) && Array.isArray(data?.options)) {
      const map: Record<string, number> = {};
      (data.options || []).forEach((opt: any) => {
        const key = String(opt?.value);
        const score = Number(opt?.score);
        if (!Number.isNaN(score)) map[key] = score;
      });
      if (Object.keys(map).length) question.scoreMap = map;
    }

    return question;
  }

  private markQuestionVisited(questionId: string | null | undefined): void {
    if (!questionId) return;
    const current = new Set(this.visitedQuestionIds());
    if (current.has(questionId)) return;
    current.add(questionId);
    this.visitedQuestionIds.set(current);
  }
}
