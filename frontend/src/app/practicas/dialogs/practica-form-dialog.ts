import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CasoListItem } from '../../core/models/casos.model';
import { CasosService } from '../../core/services/casos.service';
import { PracticasService } from '../../core/services/practicas.service';

@Component({
  selector: 'app-practica-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">Agendar práctica académica</h2>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <form [formGroup]="form" class="form-grid">
        <div class="form-group full">
          <label>Nombre</label>
          <input formControlName="nombre" maxlength="200" required />
        </div>
        <div class="form-group full">
          <label>Caso validado</label>
          <select formControlName="caso" required>
            @for (c of casos(); track c.id) {
              <option [value]="c.id">{{ c.nombre }}</option>
            }
          </select>
          @if (casos().length === 0 && !cargandoCasos()) {
            <span class="field-hint">No tienes casos validados. Publica uno desde Casos de estudio.</span>
          }
        </div>
        <div class="form-group">
          <label>Fecha y hora de inicio</label>
          <input type="datetime-local" formControlName="fecha_inicio" required />
        </div>
        <div class="form-group">
          <label>Fecha y hora de fin</label>
          <input type="datetime-local" formControlName="fecha_fin" required />
        </div>
        <div class="form-group">
          <label>Tiempo máximo (min)</label>
          <input type="number" formControlName="tiempo_max_min" min="1" />
        </div>
        <div class="form-group">
          <label>Lugar (opcional)</label>
          <input formControlName="lugar_fisico" maxlength="200" />
        </div>
        <div class="form-group full">
          <label>Mensaje para los estudiantes</label>
          <textarea formControlName="mensaje_personalizado" rows="2"></textarea>
        </div>
      </form>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary"
          [disabled]="form.invalid || loading() || casos().length === 0" (click)="guardar()">
          Agendar
        </button>
      </div>
    </div>
  `,
  styles: [`.field-hint { font-size: 0.75rem; color: var(--app-slate); }`],
})
export class PracticaFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly practicas = inject(PracticasService);
  private readonly casosSrv = inject(CasosService);
  private readonly dialogRef = inject(MatDialogRef<PracticaFormDialog>);

  readonly loading = signal(false);
  readonly cargandoCasos = signal(true);
  readonly casos = signal<CasoListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    caso: [null as number | null, Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    tiempo_max_min: [30],
    lugar_fisico: [''],
    mensaje_personalizado: [''],
  });

  ngOnInit() {
    this.casosSrv.listarCasos().subscribe({
      next: (resp) => {
        const validados = resp.results.filter((c) => c.estado === 'VALIDADO');
        this.casos.set(validados);
        if (validados.length) this.form.patchValue({ caso: validados[0].id });
        this.cargandoCasos.set(false);
      },
      error: () => this.cargandoCasos.set(false),
    });
  }

  guardar() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.practicas.crear({
      nombre: v.nombre,
      caso: v.caso as number,
      fecha_inicio: new Date(v.fecha_inicio).toISOString(),
      fecha_fin: new Date(v.fecha_fin).toISOString(),
      tiempo_max_min: v.tiempo_max_min,
      lugar_fisico: v.lugar_fisico,
      mensaje_personalizado: v.mensaje_personalizado,
    }).subscribe({
      next: (p) => this.dialogRef.close(p),
      error: () => this.loading.set(false),
    });
  }

  cerrar() { this.dialogRef.close(null); }
}
