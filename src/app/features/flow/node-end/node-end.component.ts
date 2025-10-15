import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslationPipe } from '@angulartoolsdr/translation';
import { EndNodeData, GraphNode } from '../graph.types';

@Component({
  selector: 'app-node-end',
  standalone: true,
  imports: [NgIf, TranslationPipe],
  templateUrl: './node-end.component.html',
  styleUrl: './node-end.component.scss'
})
export class NodeEndComponent {
  @Input() node!: GraphNode<EndNodeData>;

  hasCustomLabel(): boolean {
    const label = this.node?.data?.label;
    return !!label && !!label.trim();
  }

  hasConditions(): boolean {
    return !!this.node?.data?.conditions?.length;
  }
}
