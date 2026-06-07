import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Estudiante, GrupoDetalle } from '../../core/models/academico.model';
import { AcademicoService } from '../../core/services/academico.service';

interface DialogData {
  grupo: GrupoDetalle;
}

@Component({
  selector: 'app-agregar-estudiantes-dialog',
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatProgressBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">Agregar estudiantes</h2>
      <p class="dialog-sub">Grupo: <strong>{{ data.grupo.nombre }}</strong></p>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (disponibles().length === 0 && !loading()) {
        <div class="empty-state-mockup empty-state-mockup--compact">
          Todos tus estudiantes ya están en este grupo, o aún no tienes estudiantes registrados.
        </div>
      } @else {
        <ul class="pick-list">
          @for (e of disponibles(); track e.id) {
            <li>
              <label class="pick-item">
                <input type="checkbox" [(ngModel)]="seleccionados[e.id]" />
                <span>
                  <strong>{{ e.nombre_completo }}</strong>
                  <small>{{ e.correo }}</small>
                </span>
              </label>
            </li>
          }
        </ul>
      }

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary"
          [disabled]="loading() || idsSeleccionados().length === 0" (click)="agregar()">
          Agregar ({{ idsSeleccionados().length }})
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-sub { margin: -0.5rem 0 1rem; font-size: 0.84rem; color: var(--app-slate); }
    .pick-list { list-style: none; padding: 0; margin: 0; max-height: 360px; overflow-y: auto; }
    .pick-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; cursor: pointer; }
    .pick-item strong { display: block; font-size: 0.875rem; }
    .pick-item small { display: block; font-size: 0.78rem; color: var(--app-slate); margin-top: 2px; }
  `],
})
export class AgregarEstudiantesDialog implements OnInit {
  private readonly servicio = inject(AcademicoService);
  private readonly dialogRef = inject(MatDialogRef<AgregarEstudiantesDialog>);

  readonly loading = signal(true);
  readonly disponibles = signal<Estudiante[]>([]);
  seleccionados: Record<number, boolean> = {};

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.servicio.listarEstudiantes().subscribe({
      next: (resp) => {
        const idsEnGrupo = new Set(this.data.grupo.estudiantes.map((e) => e.id));
        this.disponibles.set(resp.results.filter((e) => !idsEnGrupo.has(e.id)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  idsSeleccionados(): number[] {
    return Object.entries(this.seleccionados)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
  }

  agregar(): void {
    const ids = this.idsSeleccionados();
    if (ids.length === 0) return;
    this.loading.set(true);
    this.servicio.agregarEstudiantesAGrupo(this.data.grupo.id, ids).subscribe({
      next: (grupo) => this.dialogRef.close(grupo),
      error: () => this.loading.set(false),
    });
  }

  cerrar(): void { this.dialogRef.close(null); }
}
