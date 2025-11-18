import { Routes } from '@angular/router';
import { FlowDesignerComponent, RunFormComponent, RunSummaryComponent, WorkflowListComponent } from 'forms-workflow';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'flow' },  
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
