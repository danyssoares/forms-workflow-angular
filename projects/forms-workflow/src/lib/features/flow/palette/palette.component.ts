import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';

import { TranslationPipe } from '@angulartoolsdr/translation';
import { questionTypeDefinitions, QuestionTypeDefinition } from '../../../shared/models/form-models';

@Component({
  selector: 'app-palette', standalone: true,
  imports: [MatButtonModule, MatMenuModule, CommonModule, TranslationPipe],
  templateUrl: './palette.component.html',
  styleUrls: ['./palette.component.scss']
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
