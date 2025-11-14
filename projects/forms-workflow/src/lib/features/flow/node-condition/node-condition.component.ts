import { Component, inject, Input } from '@angular/core';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCodeBranch, faDiamond } from '@fortawesome/free-solid-svg-icons';
import { GraphNode, ConditionNodeData } from '../graph.types';
import { TranslationPipe } from '@angulartoolsdr/translation';

@Component({
  selector: 'app-node-condition',
  standalone: true,
  imports: [FontAwesomeModule, TranslationPipe],
  templateUrl: './node-condition.component.html',
  styleUrl: './node-condition.component.scss'
})
export class NodeConditionComponent {
  @Input() node!: GraphNode<ConditionNodeData>;
  library = inject(FaIconLibrary);
  
  faCodeBranch = faCodeBranch;
  faDiamond = faDiamond;

  constructor() {
    this.library.addIcons(faCodeBranch, faDiamond);
  }
}
