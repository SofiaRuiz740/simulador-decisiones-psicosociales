import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AcademicoService } from '../../core/services/academico.service';
import { Grupo } from '../../core/models/academico.model';

interface DialogData {
  grupo?: Grupo;
}

@Component({
  selector: 'app-grupo-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">{{ esEdicion ? 'Editar grupo' : 'Crear grupo' }}</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Nombre del grupo</label>
          <input formControlName="nombre" required maxlength="150" />
          @for (e of fieldErrors('nombre'); track e) { <span class="field-error">{{ e }}</span> }
        </div>
        <div class="form-group full">
          <label>Materia</label>
          <select disabled><option>—</option></select>
        </div>
        <div class="form-group full">
          <label>Descripción</label>
          <textarea formControlName="descripcion" rows="3"></textarea>
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
export class GrupoFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(AcademicoService);
  private readonly dialogRef = inject(MatDialogRef<GrupoFormDialog>);

  readonly loading = signal(false);
  readonly serverErrors = signal<Record<string, string[]>>({});
  readonly esEdicion: boolean;
  readonly form;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.esEdicion = !!data.grupo;
    this.form = this.fb.nonNullable.group({
      nombre: [data.grupo?.nombre ?? '', [Validators.required, Validators.maxLength(150)]],
      descripcion: [data.grupo?.descripcion ?? ''],
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
      ? this.servicio.actualizarGrupo(this.data.grupo!.id, payload)
      : this.servicio.crearGrupo(payload);

    obs$.subscribe({
      next: (g) => this.dialogRef.close(g),
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
