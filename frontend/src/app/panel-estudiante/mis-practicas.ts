import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { MisPracticaEstudiante } from '../core/models/practicas.model';
import { EstudianteSessionService } from '../core/services/estudiante-session.service';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-mis-practicas',
  imports: [CommonModule, DatePipe, RouterLink, MatProgressBarModule, MatSnackBarModule],
  template: `
    <section class="module page">
      <header class="hero-glass">
        <h1><em>Mis</em> prácticas</h1>
      </header>

      <nav class="subnav" aria-label="Filtros de prácticas">
        @for (v of vistas; track v.id) {
          <button type="button" class="subnav-btn" [class.active]="vista() === v.id" (click)="vista.set(v.id)">
            {{ v.label }}
          </button>
        }
      </nav>

      <section class="panel">
        <div class="panel__body">
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" />
          } @else if (filtradas().length === 0) {
            <div class="empty-state-mockup">
              <strong>Sin prácticas {{ vistaLabel() }}</strong>
              Cuando tu docente te autorice, aparecerán aquí con tu código de acceso.
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Práctica</th>
                    <th>Materia</th>
                    <th>Inicio</th>
                    <th>Tiempo</th>
                    <th>Progreso</th>
                    <th>Estado</th>
                    <th class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of filtradas(); track p.autorizacion_id) {
                    <tr>
                      <td><strong>{{ p.practica_nombre }}</strong><br /><span class="muted">{{ p.caso_nombre }}</span></td>
                      <td>{{ p.materia_display?.trim() || '—' }}</td>
                      <td>{{ p.fecha_inicio | date:'short' }}</td>
                      <td>{{ p.tiempo_max_min }} min</td>
                      <td>{{ p.progreso_pct }}%</td>
                      <td><span class="badge badge--activo">{{ p.estado_display }}</span></td>
                      <td class="col-actions">
                        @if (p.estado === 'EN_CURSO') {
                          <a
                            class="btn-ghost"
                            [routerLink]="['/estudiante/practicas', p.practica_id, 'simulacion']"
                            [title]="'Código: ' + p.codigo_acceso">
                            Continuar
                          </a>
                        } @else if (p.estado === 'NO_INICIADA') {
                          <a class="btn-ghost" [routerLink]="['/panel-estudiante/practicas', p.practica_id]">Comenzar</a>
                        } @else {
                          <a class="btn-ghost" routerLink="/resultados" title="Ver resultados">Resultados</a>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>
    </section>
  `,
})
export class MisPracticas implements OnInit {
  private readonly servicio = inject(PracticasService);
  private readonly session = inject(EstudianteSessionService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly practicas = signal<MisPracticaEstudiante[]>([]);
  readonly vista = signal<'todas' | 'pendientes' | 'curso' | 'completadas'>('todas');

  readonly vistas = [
    { id: 'todas' as const, label: 'Todas' },
    { id: 'pendientes' as const, label: 'Pendientes' },
    { id: 'curso' as const, label: 'En curso' },
    { id: 'completadas' as const, label: 'Completadas' },
  ];

  readonly filtradas = computed(() => {
    const v = this.vista();
    const items = this.practicas();
    if (v === 'todas') return items;
    if (v === 'pendientes') {
      return items.filter((p) => p.estado === 'NO_INICIADA' || p.estado_display === 'Autorizado');
    }
    if (v === 'curso') return items.filter((p) => p.estado === 'EN_CURSO');
    return items.filter((p) => p.estado === 'FINALIZADA' || p.estado === 'INCOMPLETA');
  });

  ngOnInit(): void {
    this.servicio.misPracticas().subscribe({
      next: (rows) => {
        this.practicas.set(this.session.sincronizarDesdeApi(rows));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar tus prácticas.', 'OK', { duration: 3500 });
      },
    });
  }

  vistaLabel(): string {
    const map: Record<string, string> = {
      todas: 'asignadas',
      pendientes: 'pendientes',
      curso: 'en curso',
      completadas: 'completadas',
    };
    return map[this.vista()] ?? '';
  }
}
