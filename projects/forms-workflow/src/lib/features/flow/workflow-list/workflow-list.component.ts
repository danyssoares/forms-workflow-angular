import { Component, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faDiagramProject } from '@fortawesome/free-solid-svg-icons';
import { WorkflowStorageService, WorkflowSnapshot } from '../workflow-storage.service';
import { TranslationPipe, TranslationService } from '@angulartoolsdr/translation';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [NgIf, NgFor, MatCardModule, MatButtonModule, MatIconModule, FontAwesomeModule, DatePipe, TranslationPipe],
  templateUrl: './workflow-list.component.html',
  styleUrl: './workflow-list.component.scss'
})
export class WorkflowListComponent {
  private readonly storage = inject(WorkflowStorageService);
  private readonly router = inject(Router);  
  private readonly library = inject(FaIconLibrary);
  private readonly translate = inject(TranslationService);
  readonly faDiagramProject = faDiagramProject;

  readonly workflows = signal<WorkflowSnapshot[]>([]);
  readonly trackByName = (_: number, item: WorkflowSnapshot) => item.name;
  readonly descriptionFallback = 'Fluxo sem formulário associado';

  constructor() {
    this.library.addIcons(faDiagramProject);
    this.workflows.set(this.storage.listWorkflows());
  }

  createWorkflow() {
    this.router.navigate([this.router.url + '/designer']);
  }

  openWorkflow(snapshot: WorkflowSnapshot) {
    this.router.navigate([this.router.url + '/designer'], {       
      queryParams: { workflow: snapshot.name } 
    });
  }

  testWorkflow(snapshot: WorkflowSnapshot) {
    this.router.navigate([this.router.url + '/run'], {       
      queryParams: { workflow: snapshot.name } 
    });
  }

  deleteWorkflow(snapshot: WorkflowSnapshot) {
    this.storage.deleteWorkflow(snapshot.name);
    this.workflows.set(this.storage.listWorkflows());
  }

  questionCount(snapshot: WorkflowSnapshot): number {
    return snapshot.graph.nodes.filter(node => node.kind === 'question').length;
  }

  questionLabel(snapshot: WorkflowSnapshot): string {
    const total = this.questionCount(snapshot);
    return total === 1 ? '1 '+this.translate.instant('QUESTION') : `${total} ${this.translate.instant('QUESTIONS')}`;
  }

  createdDate(snapshot: WorkflowSnapshot): string {
    return snapshot.createdAt ?? snapshot.savedAt;
  }
}
