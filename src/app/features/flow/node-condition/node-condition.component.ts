import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { GraphNode } from '../graph.types';

@Component({
  selector: 'app-node-condition',
  standalone: true,
  imports: [NgFor, FontAwesomeModule],
  templateUrl: './node-condition.component.html',
  styleUrl: './node-condition.component.scss'
})
export class NodeConditionComponent {
  @Input() node!: GraphNode;
  
  faCodeBranch = faCodeBranch;
}
