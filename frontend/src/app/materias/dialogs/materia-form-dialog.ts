import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Materia } from '../../core/models/academico.model';
import { AcademicoService } from '../../core/services/academico.service';

interface DialogData {
  materia?: Materia;
}

@Component({
  selector: 'app-materia-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">{{ esEdicion ? 'Editar materia' : 'Crear materia' }}</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Nombre</label>
          <input formControlName="nombre" required maxlength="150" />
          @for (e of fieldErrors('nombre'); track e) { <span class="field-error">{{ e }}</span> }
        </div>
        <div class="form-group full">
          <label>Programa</label>
          <input formControlName="programa" maxlength="150" />
        </div>
        <div class="form-group full">
          <label>Periodo</label>
          <input formControlName="periodo" maxlength="50" placeholder="Ej. 2026-1" />
        </div>
        <div class="form-group full">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="activo" />
            Materia activa
          </label>
        </div>
      </form>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary" [disabled]="form.invalid || loading()" (click)="guardar()">
          {{ esEdicion ? 'Guardar' : 'Crear' }}
        </button>
      </div>
    </div>
  `,
  styles: [`.field-error { font-size: 0.75rem; color: var(--app-danger); }`],
})
export class MateriaFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AcademicoService);
  private readonly dialogRef = inject(MatDialogRef<MateriaFormDialog>);

  readonly loading = signal(false);
  readonly serverErrors = signal<Record<string, string[]>>({});
  readonly esEdicion: boolean;
  readonly form;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.esEdicion = !!data.materia;
    this.form = this.fb.nonNullable.group({
      nombre: [data.materia?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
      programa: [data.materia?.programa ?? ''],
      periodo: [data.materia?.periodo ?? ''],
      activo: [data.materia?.activo ?? true],
    });
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
      ? this.servicio.actualizarMateria(this.data.materia!.id, payload)
      : this.servicio.crearMateria(payload);

    obs$.subscribe({
      next: (m) => this.dialogRef.close(m),
      error: (err) => {
        this.loading.set(false);
        this.serverErrors.set(this.parse(err.error));
      },
    });
  }

  cerrar(): void { this.dialogRef.close(null); }

  private parse(body: unknown): Record<string, string[]> {
    if (!body || typeof body !== 'object') return { non_field_errors: ['Error inesperado.'] };
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(body)) {
      out[k] = Array.isArray(v) ? (v as string[]) : [String(v)];
    }
    return out;
  }
}
