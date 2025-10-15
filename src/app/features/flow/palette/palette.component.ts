import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { questionTypeDefinitions, QuestionTypeDefinition } from '../../../shared/models/form-models';
import { TranslationPipe } from '@angulartoolsdr/translation';

@Component({
  selector: 'app-palette', standalone: true,
  imports: [MatButtonModule, MatMenuModule, CommonModule, TranslationPipe],
  template: `
  <div class="palette">
    <button mat-raised-button color="primary" [matMenuTriggerFor]="q">{{ 'QUESTION+' | translate }}</button>
    <mat-menu #q="matMenu" class="question-menu">
      <div class="options-container">
        <button mat-menu-item 
                *ngFor="let option of questionDefinitions" 
                (click)="selectQuestion(option)">
          {{ option.labelKey | translate }}
        </button>
      </div>
    </mat-menu>

    <button mat-raised-button color="accent" [matMenuTriggerFor]="c">{{ 'CONDITION+' | translate }}</button>
    <mat-menu #c="matMenu">
      <button mat-menu-item (click)="add.emit({kind:'condition', conditionType: 'comparison'})">{{ 'CONDITION_COMPARISON' | translate }}</button>
      <button mat-menu-item (click)="add.emit({kind:'condition', conditionType: 'expression'})">{{ 'CONDITION_EXPRESSION' | translate }}</button>
    </mat-menu>
    <button mat-raised-button color="tertiary" (click)="add.emit({kind:'action'})">{{ 'ACTION+' | translate }}</button>
    <button mat-raised-button color="warn" (click)="add.emit({kind:'end'})">{{ 'END+' | translate }}</button>
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

  questionDefinitions = questionTypeDefinitions;

  selectQuestion(def: QuestionTypeDefinition) {
    this.add.emit({
      kind: 'question',
      type: def
    });
  }
}
