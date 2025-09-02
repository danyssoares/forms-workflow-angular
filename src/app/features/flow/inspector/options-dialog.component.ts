import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Option } from '../../../shared/models/form-models';

@Component({
  selector: 'app-options-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, FormsModule, CommonModule],
  template: `
    <h2 mat-dialog-title>Configurar Opções</h2>
    <div mat-dialog-content>
      <div *ngFor="let opt of options; let i=index" class="option-row">
        <mat-form-field appearance="outline">
          <mat-label>Label</mat-label>
          <input matInput [(ngModel)]="opt.label">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Valor</mat-label>
          <input matInput [(ngModel)]="opt.value">
        </mat-form-field>
        <button mat-icon-button color="warn" aria-label="Excluir" (click)="remove(i)">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
      <button mat-stroked-button type="button" (click)="add()">Adicionar Opção</button>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="save()">Salvar</button>
    </div>
  `,
  styles: [`
    .option-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    mat-form-field { flex: 1; }
  `]
})
export class OptionsDialogComponent {
  options: Option[] = [];
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {options: Option[]},
    public dialogRef: MatDialogRef<OptionsDialogComponent>
  ) {
    this.options = data.options ? data.options.map(o => ({...o})) : [];
  }
  add(){ this.options.push({ value: '', label: '' }); }
  remove(i: number){ this.options.splice(i,1); }
  save(){ this.dialogRef.close(this.options); }
}
