import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-palette', standalone: true,
  imports: [MatButtonModule, MatMenuModule],
  template: `
  <div class="palette">
    <button mat-raised-button color="primary" [matMenuTriggerFor]="q">Pergunta +</button>
    <mat-menu #q="matMenu">
      <button mat-menu-item (click)="add.emit({kind:'question',type:'text'})">Texto</button>
      <button mat-menu-item (click)="add.emit({kind:'question',type:'boolean'})">Boolean</button>
      <button mat-menu-item (click)="add.emit({kind:'question',type:'integer'})">Inteiro</button>
      <button mat-menu-item (click)="add.emit({kind:'question',type:'select'})">Lista</button>
    </mat-menu>

    <button mat-raised-button color="accent" (click)="add.emit({kind:'condition'})">Condição +</button>
    <button mat-raised-button color="tertiary" (click)="add.emit({kind:'action'})">Ação +</button>
  </div>
  `
})
export class PaletteComponent { @Output() add = new EventEmitter<any>(); }