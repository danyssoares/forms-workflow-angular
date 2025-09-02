import { Component, Input } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { GraphNode } from '../graph.types';

@Component({
  selector: 'app-node-question',
  standalone: true,
  imports: [FontAwesomeModule, TitleCasePipe],
  templateUrl: './node-question.component.html',
  styleUrl: './node-question.component.scss'
})
export class NodeQuestionComponent {
  @Input() node!: GraphNode;

  faComment = faComment;
}
