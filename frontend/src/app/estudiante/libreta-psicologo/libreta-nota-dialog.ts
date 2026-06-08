import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface LibretaNotaDialogData {
  titulo: string;
  contenido?: string;
  confirmar: string;
}

@Component({
  selector: 'app-libreta-nota-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="campo-nota">
        <mat-label>Contenido de la nota</mat-label>
        <textarea
          matInput
          rows="6"
          [formControl]="form.controls.contenido"
          placeholder="Registra observaciones clínicas, impresiones o preguntas…"></textarea>
        @if (form.controls.contenido.touched && form.controls.contenido.invalid) {
          <mat-error>Escribe al menos un carácter.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">
        {{ data.confirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .campo-nota {
      width: 100%;
      min-width: 280px;
    }
  `,
})
export class LibretaNotaDialog {
  readonly data = inject<LibretaNotaDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<LibretaNotaDialog, string | undefined>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    contenido: [this.data.contenido ?? '', [Validators.required, Validators.minLength(1)]],
  });

  confirmar(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.controls.contenido.value.trim());
  }
}
