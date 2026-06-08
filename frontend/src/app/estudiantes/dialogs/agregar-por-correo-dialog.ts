import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AcademicoService } from '../../core/services/academico.service';

@Component({
  selector: 'app-agregar-por-correo-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">Agregar por correo</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <p class="dialog-hint">
        Si el estudiante ya existe en el sistema, se vinculará a tu lista; si no, se creará con los datos provistos.
      </p>

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Correo electrónico</label>
          <input type="email" formControlName="correo" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Nombre (opcional)</label>
          <input formControlName="first_name" />
        </div>
        <div class="form-group">
          <label>Apellido (opcional)</label>
          <input formControlName="last_name" />
        </div>
      </form>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary" [disabled]="form.invalid || loading()" (click)="enviar()">
          Agregar
        </button>
      </div>
    </div>
  `,
  styles: [`.dialog-hint { margin: 0 0 1rem; font-size: 0.84rem; color: var(--app-slate); line-height: 1.5; }`],
})
export class AgregarPorCorreoDialog {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AcademicoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<AgregarPorCorreoDialog>);

  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    first_name: [''],
    last_name: [''],
  });

  enviar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.servicio.agregarPorCorreo(this.form.getRawValue()).subscribe({
      next: (est) => {
        const msg = est._creado
          ? `Estudiante creado: ${est.correo}`
          : `Estudiante existente vinculado: ${est.correo}`;
        this.snackBar.open(msg, 'OK', { duration: 3500 });
        this.dialogRef.close(est);
      },
      error: (err) => {
        this.loading.set(false);
        const detalle = err?.error?.correo?.[0] ?? err?.error?.detail ?? 'Error al agregar.';
        this.snackBar.open(detalle, 'OK', { duration: 4000 });
      },
    });
  }

  cerrar(): void { this.dialogRef.close(null); }
}
