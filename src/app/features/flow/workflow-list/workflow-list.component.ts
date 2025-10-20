import { Component, inject, signal } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faDiagramProject } from '@fortawesome/free-solid-svg-icons';
import { WorkflowStorageService, WorkflowSnapshot } from '../workflow-storage.service';

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [NgIf, NgFor, MatCardModule, MatButtonModule, MatIconModule, FontAwesomeModule, DatePipe],
  templateUrl: './workflow-list.component.html',
  styleUrl: './workflow-list.component.scss'
})
export class WorkflowListComponent {
  private readonly storage = inject(WorkflowStorageService);
  private readonly router = inject(Router);
  private readonly library = inject(FaIconLibrary);
  readonly faDiagramProject = faDiagramProject;

  readonly workflows = signal<WorkflowSnapshot[]>([]);
  readonly trackByName = (_: number, item: WorkflowSnapshot) => item.name;

  constructor() {
    this.library.addIcons(faDiagramProject);
    this.workflows.set(this.storage.listWorkflows());
  }

  createWorkflow() {
    this.router.navigate(['/flow/designer']);
  }

  openWorkflow(snapshot: WorkflowSnapshot) {
    this.router.navigate(['/flow/designer'], { queryParams: { workflow: snapshot.name } });
  }

  deleteWorkflow(snapshot: WorkflowSnapshot) {
    this.storage.deleteWorkflow(snapshot.name);
    this.workflows.set(this.storage.listWorkflows());
  }
}
