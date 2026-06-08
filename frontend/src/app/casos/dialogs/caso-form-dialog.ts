import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CasoListItem, EstadoCaso } from '../../core/models/casos.model';
import { CasosService } from '../../core/services/casos.service';

interface DialogData { caso?: CasoListItem }

@Component({
  selector: 'app-caso-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">{{ esEdicion ? 'Editar caso' : 'Crear caso' }}</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Nombre</label>
          <input formControlName="nombre" maxlength="200" required />
        </div>
        <div class="form-group full">
          <label>Descripción breve</label>
          <textarea formControlName="descripcion" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Área psicosocial</label>
          <input formControlName="area_psicosocial" maxlength="150" />
        </div>
        <div class="form-group">
          <label>Tiempo estimado (min)</label>
          <input type="number" formControlName="tiempo_estimado_min" min="1" />
        </div>
        @if (esEdicion) {
          <div class="form-group full">
            <label>Estado</label>
            <select formControlName="estado">
              <option value="BORRADOR">Borrador</option>
              <option value="EN_REVISION">En revisión</option>
              <option value="VALIDADO">Validado</option>
              <option value="ARCHIVADO">Archivado</option>
            </select>
          </div>
        }
      </form>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary" [disabled]="form.invalid || loading()" (click)="guardar()">
          {{ esEdicion ? 'Guardar' : 'Crear' }}
        </button>
      </div>
    </div>
  `,
})
export class CasoFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(CasosService);
  private readonly dialogRef = inject(MatDialogRef<CasoFormDialog>);

  readonly loading = signal(false);
  readonly esEdicion: boolean;
  readonly form;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.esEdicion = !!data.caso;
    this.form = this.fb.nonNullable.group({
      nombre: [data.caso?.nombre ?? '', [Validators.required, Validators.maxLength(200)]],
      descripcion: [data.caso?.descripcion ?? ''],
      area_psicosocial: [data.caso?.area_psicosocial ?? ''],
      tiempo_estimado_min: [data.caso?.tiempo_estimado_min ?? 30],
      estado: [data.caso?.estado ?? EstadoCaso.Borrador],
    });
  }

  guardar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const payload = this.form.getRawValue();
    const obs$ = this.esEdicion
      ? this.servicio.actualizarCaso(this.data.caso!.id, payload)
      : this.servicio.crearCaso(payload);
    obs$.subscribe({
      next: (caso) => this.dialogRef.close(caso),
      error: () => this.loading.set(false),
    });
  }

  cerrar() { this.dialogRef.close(null); }
}
