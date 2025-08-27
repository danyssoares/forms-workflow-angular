import { Component, computed } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { GraphStateService } from '../graph-state.service';

@Component({
  selector: 'app-inspector', standalone: true,
  imports: [NgIf, NgSwitch, NgSwitchCase, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
  <div class="sidebar" *ngIf="node() as n">
    <h3>Inspector</h3>
    <div [ngSwitch]="n.kind">
      <!-- QUESTION -->
      <form *ngSwitchCase="'question'" [formGroup]="fgQ">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Label</mat-label>
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
          <mat-label>Help</mat-label>
          <input matInput formControlName="helpText">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="saveQ()">Salvar</button>
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
        <button mat-raised-button color="primary" (click)="saveC()">Salvar</button>
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
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Parâmetros (JSON simples)</mat-label>
          <input matInput formControlName="params" placeholder='{"alertCode":"ALERTA"}'>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="saveA()">Salvar</button>
      </form>
    </div>
  </div>
  `
})
export class InspectorComponent {
  node = computed(() => this.state.selectedNode);

  fgQ: FormGroup;
  fgC: FormGroup;
  fgA: FormGroup;
  
  constructor(private state: GraphStateService, private fb: FormBuilder) {
    this.fgQ = this.fb.group({ label: [''], type: ['text'], helpText: [''] });
    this.fgC = this.fb.group({ sourceQuestionId: [''], operator: ['=='], value: [''] });
    this.fgA = this.fb.group({ type: ['emitAlert'], params: ['{"alertCode":"RISCO"}'] });
  }

  saveQ(){ const n = this.state.selectedNode; if(!n) return; this.state.updateNode(n.id, { ...n.data, ...this.fgQ.value, id: n.data.id||`q_${n.id.slice(0,4)}` }); }
  saveC(){ const n = this.state.selectedNode; if(!n) return; this.state.updateNode(n.id, { ...n.data, ...this.fgC.value }); }
  saveA(){ const n = this.state.selectedNode; if(!n) return; let params:any={}; try{ params = JSON.parse(this.fgA.value.params||'{}'); }catch{} this.state.updateNode(n.id, { ...n.data, type:this.fgA.value.type, params }); }
}