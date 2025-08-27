import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatIconModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>schema</mat-icon>
      <span style="margin-left:8px">Forms Workflow</span>
      <span class="spacer"></span>
      <a mat-button routerLink="/forms">Formulários</a>
      <a mat-button routerLink="/flow">Flow</a>
      <a mat-button routerLink="/run">Runner</a>
    </mat-toolbar>
    <router-outlet />
  `,
  styles: [`.spacer{flex:1}`]
})
export class AppComponent {}