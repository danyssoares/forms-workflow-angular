import { Routes } from '@angular/router';
import { FormsListComponent } from './forms-list/forms-list.component';
import { FormEditorComponent } from './form-editor/form-editor.component';

export const FORMS_ROUTES: Routes = [
  { path: '', component: FormsListComponent },
  { path: ':id', component: FormEditorComponent },
];
