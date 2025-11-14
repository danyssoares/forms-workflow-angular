import { Routes } from '@angular/router';
import { FlowDesignerComponent, FORMS_ROUTES, RunFormComponent, RunSummaryComponent, WorkflowListComponent } from 'forms-workflow';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'flow' },
  { path: 'forms', children: FORMS_ROUTES },
  {
    path: 'flow', children: [
      { path: '', component: WorkflowListComponent },
      { path: 'designer', component: FlowDesignerComponent }
    ]
  },
  { path: 'run', component: RunFormComponent },
  { path: 'run/summary', component: RunSummaryComponent },
  { path: '**', redirectTo: 'flow' }
];
