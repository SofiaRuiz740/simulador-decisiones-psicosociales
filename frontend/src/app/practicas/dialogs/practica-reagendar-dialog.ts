import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Practica } from '../../core/models/practicas.model';
import { PracticasService } from '../../core/services/practicas.service';

export interface PracticaReagendarDialogData {
  practica: Practica;
}

/** Convierte un ISO string a formato compatible con <input type="datetime-local">. */
function aDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-practica-reagendar-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">Reagendar práctica</h2>
      <p class="mockup-dialog__subtitle">{{ data.practica.nombre }}</p>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid form-grid--reagendar">
        <div class="form-group full">
          <label for="reInicio">Fecha y hora de inicio</label>
          <input id="reInicio" type="datetime-local" formControlName="fecha_inicio" required />
        </div>
        <div class="form-group full">
          <label for="reFin">Fecha y hora de fin</label>
          <input id="reFin" type="datetime-local" formControlName="fecha_fin" required />
        </div>
      </form>

      @if (error()) {
        <p class="field-hint field-hint--error">{{ error() }}</p>
      }

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary"
          [disabled]="form.invalid || loading()" (click)="guardar()">
          Guardar cambios
        </button>
      </div>
    </div>
  `,
  styles: [`
    .field-hint { font-size: 0.75rem; color: var(--app-slate); }
    .field-hint--error { color: var(--app-danger, #d64545); margin-top: 0.75rem; }
    .mockup-dialog__subtitle { margin: -4px 0 12px; color: var(--app-slate); font-size: 0.85rem; }
    .form-grid--reagendar {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .form-grid--reagendar input[type="datetime-local"] {
      width: 100%;
      box-sizing: border-box;
    }
  `],
})
export class PracticaReagendarDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practicasSrv = inject(PracticasService);
  private readonly dialogRef = inject(MatDialogRef<PracticaReagendarDialog>);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: PracticaReagendarDialogData) {}

  ngOnInit(): void {
    this.form.setValue({
      fecha_inicio: aDatetimeLocal(this.data.practica.fecha_inicio),
      fecha_fin: aDatetimeLocal(this.data.practica.fecha_fin),
    });
  }

  guardar(): void {
    if (this.form.invalid || this.loading()) return;

    const v = this.form.getRawValue();
    const fechaInicio = new Date(v.fecha_inicio);
    const fechaFin = new Date(v.fecha_fin);

    if (fechaFin <= fechaInicio) {
      this.error.set('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    this.error.set('');
    this.loading.set(true);
    this.practicasSrv.actualizar(this.data.practica.id, {
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
    }).subscribe({
      next: (p) => {
        this.loading.set(false);
        this.snackBar.open('Práctica reagendada.', 'OK', { duration: 2500 });
        this.dialogRef.close(p);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.fecha_fin?.[0]
          ?? err?.error?.fecha_inicio?.[0]
          ?? err?.error?.non_field_errors?.[0]
          ?? err?.error?.detail
          ?? 'No se pudo reagendar la práctica.';
        this.error.set(msg);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
