import { Component, Input } from '@angular/core';
import { NgIf, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { GraphNode } from '../graph.types';
import { GraphStateService } from '../graph-state.service';
import { OptionsDialogComponent } from '../inspector/options-dialog.component';

@Component({
  selector: 'app-node-question',
  standalone: true,
  imports: [NgIf, FormsModule, MatDialogModule, FontAwesomeModule, TitleCasePipe, OptionsDialogComponent],
  templateUrl: './node-question.component.html',
  styleUrl: './node-question.component.scss'
})
export class NodeQuestionComponent {
  @Input() node!: GraphNode;
  @Input() editing = false;
  @Input() editBuffer: any = {};

  faComment = faComment;
  focused: 'label' | 'type' | 'trueLabel' | 'falseLabel' | null = null;

  constructor(private dialog: MatDialog, private state: GraphStateService) {}

  openOptions() {
    const dialogRef = this.dialog.open(OptionsDialogComponent, {
      width: '400px',
      data: { options: this.editBuffer.options || [] }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.editBuffer.options = res;
        this.state.updateNode(this.node.id, { ...this.node.data, options: res });
      }
    });
  }
}
