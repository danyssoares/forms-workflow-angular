import { Component, Input, inject } from '@angular/core';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { GraphNode, ActionNodeData } from '../graph.types';
import { TranslationPipe } from '@angulartoolsdr/translation';

@Component({
  selector: 'app-node-action',
  standalone: true,
  imports: [FontAwesomeModule, TranslationPipe],
  templateUrl: './node-action.component.html',
  styleUrl: './node-action.component.scss'
})
export class NodeActionComponent {
  @Input() node!: GraphNode<ActionNodeData>;

  private readonly library = inject(FaIconLibrary);
  faGear = faGear;

  constructor() {
    this.library.addIcons(faGear);
  }

  labelKey(): string {
    const type = this.node?.data?.type;
    if (!type) return 'ACTION_TYPE_DEFAULT';
    const map: Record<string, string> = {
      sendNotification: 'ACTION_TYPE_SEND_NOTIFICATION',
      emitAlert: 'ACTION_TYPE_EMIT_ALERT',
      webhook: 'ACTION_TYPE_WEBHOOK',
      setTag: 'ACTION_TYPE_SET_TAG',
      setField: 'ACTION_TYPE_SET_FIELD',
      openForm: 'ACTION_TYPE_OPEN_FORM'
    };
    return map[type] ?? 'ACTION_TYPE_DEFAULT';
  }
}
