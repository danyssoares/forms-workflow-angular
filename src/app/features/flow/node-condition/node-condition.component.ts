import { Component, inject, Input } from '@angular/core';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons';
import { GraphNode } from '../graph.types';

@Component({
  selector: 'app-node-condition',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './node-condition.component.html',
  styleUrl: './node-condition.component.scss'
})
export class NodeConditionComponent {
  @Input() node!: GraphNode;
  library = inject(FaIconLibrary);
  
  faCodeBranch = faCodeBranch;

  constructor() {
    this.library.addIcons(faCodeBranch);
  }
}
