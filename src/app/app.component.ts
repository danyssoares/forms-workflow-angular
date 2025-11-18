import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslationPipe } from '@angulartoolsdr/translation';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faDiagramProject } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatIconModule, MatButtonModule, TranslationPipe, FontAwesomeModule],
  template: `
    <mat-toolbar color="primary">
      <fa-icon [icon]="faDiagramProject"></fa-icon>
      <span style="margin-left:8px">{{ 'FORMS_WORKFLOW' | translate }}</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/flow">{{ 'FLOW' | translate }}</a>
      <a mat-button routerLink="/run">{{ 'RUNNER' | translate }}</a>
    </mat-toolbar>
    <router-outlet />
  `,
  styles: [`.spacer{flex:1}`]
})
export class AppComponent {
  faDiagramProject = faDiagramProject;

  constructor(library: FaIconLibrary) {
    library.addIcons(faDiagramProject);
  }
}
