import { Routes } from '@angular/router';
import { FormsListComponent } from './features/forms/forms-list/forms-list.component';
import { FormEditorComponent } from './features/forms/form-editor/form-editor.component';
import { FlowDesignerComponent } from './features/flow/flow-designer/flow-designer.component';
import { RunFormComponent } from './features/run/run-form/run-form.component';
import { RunSummaryComponent } from './features/run/run-summary/run-summary.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'flow' },
  {
    path: 'forms', children: [
      { path: '', component: FormsListComponent },
      { path: ':id', component: FormEditorComponent },
    ]
  },
  { path: 'flow', component: FlowDesignerComponent },
  { path: 'run', component: RunFormComponent },
  { path: 'run/summary', component: RunSummaryComponent },
  { path: '**', redirectTo: 'flow' }
];