import { Component, computed, effect } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgFor } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSave, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import { GraphStateService } from '../graph-state.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [NgIf, NgSwitch, NgSwitchCase, NgFor, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, FontAwesomeModule],
  template: `
  <div class="sidebar" *ngIf="node() as n">
    <h3>Inspector</h3>
    <div [ngSwitch]="n.kind">
      <!-- QUESTION -->
      <form *ngSwitchCase="'question'" [formGroup]="fgQ">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Texto</mat-label>
          <input matInput formControlName="label">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="type">
            <mat-option value="text">Texto</mat-option>
            <mat-option value="boolean">Boolean</mat-option>
            <mat-option value="integer">Inteiro</mat-option>
            <mat-option value="double">Double</mat-option>
            <mat-option value="select">Lista</mat-option>
            <mat-option value="radio">Radio</mat-option>
            <mat-option value="checkbox">Checkbox</mat-option>
            <mat-option value="date">Data</mat-option>
            <mat-option value="datetime">Data e Hora</mat-option>
            <mat-option value="image">Imagem</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Score</mat-label>
          <input matInput type="number" formControlName="score">
        </mat-form-field>
        <div *ngIf="fgQ.get('type')?.value === 'boolean'">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Label Verdadeiro</mat-label>
            <input matInput formControlName="trueLabel">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Label Falso</mat-label>
            <input matInput formControlName="falseLabel">
          </mat-form-field>
        </div>
        <div *ngIf="['select','radio','checkbox'].includes(fgQ.get('type')?.value)">
          <div formArrayName="options">
            <div *ngFor="let opt of options.controls; let i=index" [formGroupName]="i" class="option-row">
              <mat-form-field appearance="outline">
                <mat-label>Label</mat-label>
                <input matInput formControlName="label">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Valor</mat-label>
                <input matInput formControlName="value">
              </mat-form-field>
              <button mat-icon-button type="button" (click)="removeOption(i)">
                <fa-icon [icon]="faTrash"></fa-icon>
              </button>
            </div>
            <button mat-stroked-button type="button" (click)="addOption()">Adicionar Opção</button>
          </div>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" type="button" (click)="saveQ()">
            <fa-icon [icon]="faSave"></fa-icon>
            Salvar
          </button>
          <button mat-button type="button" (click)="cancel()">
            <fa-icon [icon]="faTimes"></fa-icon>
            Cancelar
          </button>
        </div>
      </form>

      <!-- CONDITION -->
      <form *ngSwitchCase="'condition'" [formGroup]="fgC">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Pergunta origem (ID)</mat-label>
          <input matInput formControlName="sourceQuestionId" placeholder="ex.: q1">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Operador</mat-label>
          <mat-select formControlName="operator">
            <mat-option value="==">==</mat-option>
            <mat-option value=">">&gt;</mat-option>
            <mat-option value=">=">&gt;=</mat-option>
            <mat-option value="<">&lt;</mat-option>
            <mat-option value="<=">&lt;=</mat-option>
            <mat-option value="!=">!=</mat-option>
            <mat-option value="in">in</mat-option>
            <mat-option value="contains">contains</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Valor</mat-label>
          <input matInput formControlName="value">
        </mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" type="button" (click)="saveC()">
            <fa-icon [icon]="faSave"></fa-icon>
            Salvar
          </button>
          <button mat-button type="button" (click)="cancel()">
            <fa-icon [icon]="faTimes"></fa-icon>
            Cancelar
          </button>
        </div>
      </form>

      <!-- ACTION -->
      <form *ngSwitchCase="'action'" [formGroup]="fgA">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Tipo de Ação</mat-label>
          <mat-select formControlName="type">
            <mat-option value="emitAlert">emitAlert</mat-option>
            <mat-option value="openForm">openForm</mat-option>
            <mat-option value="webhook">webhook</mat-option>
            <mat-option value="setTag">setTag</mat-option>
            <mat-option value="setField">setField</mat-option>
          </mat-select>
        </mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" type="button" (click)="saveA()">
            <fa-icon [icon]="faSave"></fa-icon>
            Salvar
          </button>
          <button mat-button type="button" (click)="cancel()">
            <fa-icon [icon]="faTimes"></fa-icon>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
  styleUrl: './inspector.component.scss'
})
export class InspectorComponent {
  faSave = faSave;
  faTimes = faTimes;
  faTrash = faTrash;

  graph = toSignal(this.state.graph$, { initialValue: { nodes: [], edges: [] } });
  selectedId = toSignal(this.state.selectedId$, { initialValue: null });
  node = computed(() => this.graph().nodes.find(n => n.id === this.selectedId()));

  fgQ: FormGroup;
  fgC: FormGroup;
  fgA: FormGroup;

  constructor(private state: GraphStateService, private fb: FormBuilder) {
    this.fgQ = this.fb.group({
      label: [''],
      type: ['text'],
      score: [0],
      trueLabel: ['Verdadeiro'],
      falseLabel: ['Falso'],
      options: this.fb.array([])
    });
    this.fgC = this.fb.group({ sourceQuestionId: [''], operator: ['=='], value: [''] });
    this.fgA = this.fb.group({ type: ['emitAlert'] });

    effect(() => {
      const n = this.node();
      if (!n) return;
      if (n.kind === 'question') {
        const opts = n.data.options || [];
        const arr = this.options;
        arr.clear();
        opts.forEach(o => arr.push(this.fb.group({ label: [o.label], value: [o.value] })));
        this.fgQ.patchValue({ label: n.data.label, type: n.data.type, score: n.data.score || 0, trueLabel: n.data.trueLabel || 'Verdadeiro', falseLabel: n.data.falseLabel || 'Falso' });
      }
      if (n.kind === 'condition') this.fgC.patchValue(n.data);
      if (n.kind === 'action') this.fgA.patchValue({ type: n.data.type });
    });
  }

  get options() { return this.fgQ.get('options') as FormArray; }
  addOption() { this.options.push(this.fb.group({ label: [''], value: [''] })); }
  removeOption(i: number) { this.options.removeAt(i); }

  saveQ() {
    const n = this.node();
    if (!n) return;
    const formValue = this.fgQ.value as any;
    const data: any = { ...n.data, label: formValue.label, type: formValue.type, score: formValue.score };
    data.id = n.data.id || `q_${n.id.slice(0,4)}`;
    if (formValue.type === 'boolean') {
      data.trueLabel = formValue.trueLabel;
      data.falseLabel = formValue.falseLabel;
    }
    if (['select', 'radio', 'checkbox'].includes(formValue.type)) {
      data.options = formValue.options || [];
    }
    this.state.updateNode(n.id, data);
    this.state.closeSidebar();
  }

  saveC() {
    const n = this.node();
    if (!n) return;
    this.state.updateNode(n.id, { ...n.data, ...this.fgC.value });
    this.state.closeSidebar();
  }

  saveA() {
    const n = this.node();
    if (!n) return;
    this.state.updateNode(n.id, { ...n.data, type: this.fgA.value.type });
    this.state.closeSidebar();
  }

  cancel() { this.state.closeSidebar(); }
}

