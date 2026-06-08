import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Estudiante } from '../../core/models/academico.model';
import { AcademicoService } from '../../core/services/academico.service';

interface DialogData {
  estudiante?: Estudiante;
}

@Component({
  selector: 'app-estudiante-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">{{ esEdicion ? 'Editar estudiante' : 'Registrar estudiante' }}</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Correo electrónico</label>
          <input type="email" formControlName="correo" required />
          @for (e of fieldErrors('correo'); track e) { <span class="field-error">{{ e }}</span> }
        </div>
        <div class="form-group">
          <label>Nombre</label>
          <input formControlName="first_name" required />
          @for (e of fieldErrors('first_name'); track e) { <span class="field-error">{{ e }}</span> }
        </div>
        <div class="form-group">
          <label>Apellido</label>
          <input formControlName="last_name" required />
          @for (e of fieldErrors('last_name'); track e) { <span class="field-error">{{ e }}</span> }
        </div>
        <div class="form-group">
          <label>Identificación</label>
          <input formControlName="identificacion" maxlength="50" placeholder="Opcional" />
        </div>
        <div class="form-group">
          <label>Grupo</label>
          <select disabled><option>—</option></select>
        </div>
        @if (esEdicion) {
          <div class="form-group full">
            <label class="check-row">
              <input type="checkbox" formControlName="activo" />
              Estudiante activo
            </label>
          </div>
        }
      </form>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary" [disabled]="form.invalid || loading()" (click)="guardar()">
          {{ esEdicion ? 'Guardar' : 'Registrar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .field-error { font-size: 0.75rem; color: var(--app-danger); }
    .check-row { display: flex; align-items: center; gap: 8px; text-transform: none; letter-spacing: 0; font-size: 0.875rem; color: var(--app-text); }
  `],
})
export class EstudianteFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AcademicoService);
  private readonly dialogRef = inject(MatDialogRef<EstudianteFormDialog>);

  readonly loading = signal(false);
  readonly serverErrors = signal<Record<string, string[]>>({});
  readonly esEdicion: boolean;
  readonly form;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.esEdicion = !!data.estudiante;
    this.form = this.fb.nonNullable.group({
      correo: [data.estudiante?.correo ?? '', [Validators.required, Validators.email]],
      first_name: [data.estudiante?.first_name ?? '', [Validators.required]],
      last_name: [data.estudiante?.last_name ?? '', [Validators.required]],
      identificacion: [data.estudiante?.identificacion ?? ''],
      activo: [data.estudiante?.activo ?? true],
    });
    if (this.esEdicion) this.form.controls.correo.disable();
  }

  fieldErrors(field: string): string[] {
    return this.serverErrors()[field] ?? [];
  }

  guardar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.serverErrors.set({});
    const payload = this.form.getRawValue();

    const obs$ = this.esEdicion
      ? this.servicio.actualizarEstudiante(this.data.estudiante!.id, {
          first_name: payload.first_name,
          last_name: payload.last_name,
          identificacion: payload.identificacion.trim(),
          activo: payload.activo,
        })
      : this.servicio.crearEstudiante({
          correo: payload.correo,
          first_name: payload.first_name,
          last_name: payload.last_name,
          identificacion: payload.identificacion.trim(),
        });

    obs$.subscribe({
      next: (estudiante) => this.dialogRef.close(estudiante),
      error: (err) => {
        this.loading.set(false);
        this.serverErrors.set(this.parseErrors(err.error));
      },
    });
  }

  cerrar(): void { this.dialogRef.close(null); }

  private parseErrors(body: unknown): Record<string, string[]> {
    if (!body || typeof body !== 'object') return { non_field_errors: ['Error inesperado.'] };
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(body)) {
      out[k] = Array.isArray(v) ? (v as string[]) : [String(v)];
    }
    return out;
  }
}
