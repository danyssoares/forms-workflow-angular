import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { questionTypes } from '../../../shared/models/form-models';

interface QuestionTypeOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-palette', standalone: true,
  imports: [MatButtonModule, MatMenuModule, CommonModule],
  template: `
  <div class="palette">
    <button mat-raised-button color="primary" [matMenuTriggerFor]="q">Pergunta +</button>
    <mat-menu #q="matMenu" class="question-menu">
      <div class="options-container">
        <button mat-menu-item 
                *ngFor="let option of questionOptions" 
                (click)="add.emit({kind:'question',type:option})">
          {{option.label}}
        </button>
      </div>
    </mat-menu>

    <button mat-raised-button color="accent" [matMenuTriggerFor]="c">Condição +</button>
    <mat-menu #c="matMenu">
      <button mat-menu-item (click)="add.emit({kind:'condition', conditionType: 'comparison'})">Comparação</button>
      <button mat-menu-item (click)="add.emit({kind:'condition', conditionType: 'expression'})">Expressão</button>
    </mat-menu>
    <button mat-raised-button color="tertiary" (click)="add.emit({kind:'action'})">Ação +</button>
    <button mat-raised-button color="warn" (click)="add.emit({kind:'end'})">Final +</button>
  </div>
  `,
  styles: [`
    .options-container {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .question-menu {
      max-height: 400px;
      background-color: #f5f5f5; /* Cor de fundo do sistema */
    }
  `]
})
export class PaletteComponent { 
  @Output() add = new EventEmitter<any>();

  questionOptions: QuestionTypeOption[] = questionTypes;
}