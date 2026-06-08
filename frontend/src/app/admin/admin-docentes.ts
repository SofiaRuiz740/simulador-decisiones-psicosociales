import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DocenteAdmin, ExtrasService } from '../core/services/extras.service';

@Component({
  selector: 'app-admin-docentes',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <section class="module page">
      <header class="hero-glass">
        <h1><em>Docentes</em></h1>
        <p class="hero-glass__meta">Supervisión de perfiles docentes en la plataforma</p>
      </header>

      @if (!loading()) {
        <section class="metrics metrics--compact">
          <article class="metric metric--teal">
            <div class="metric__value">{{ docentes().length }}</div>
            <div class="metric__label">Total docentes</div>
          </article>
          <article class="metric">
            <div class="metric__value">{{ activos() }}</div>
            <div class="metric__label">Activos</div>
          </article>
          <article class="metric metric--accent">
            <div class="metric__value">{{ totalCasos() }}</div>
            <div class="metric__label">Casos creados</div>
          </article>
          <article class="metric">
            <div class="metric__value">{{ totalPracticas() }}</div>
            <div class="metric__label">Prácticas</div>
          </article>
        </section>
      }

      <section class="panel">
        <div class="panel__toolbar">
          <div class="toolbar">
            <div class="toolbar__filters">
              <input type="search" placeholder="Buscar…" [ngModel]="filtroTexto()" (ngModelChange)="filtroTexto.set($event)" />
              <select [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event)">
                <option value="">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </div>
        </div>
        <div class="panel__body">
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" />
          } @else if (filtrados().length === 0) {
            <div class="empty-state-mockup">
              <strong>Sin docentes registrados</strong>
              Aún no hay cuentas con rol docente en el sistema.
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Docente</th>
                    <th>Correo</th>
                    <th>Casos</th>
                    <th>Prácticas</th>
                    <th>Estudiantes</th>
                    <th>Grupos</th>
                    <th>Materias</th>
                    <th>Estado</th>
                    <th>Alta</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of filtrados(); track d.id) {
                    <tr>
                      <td><strong>{{ d.nombre_completo }}</strong></td>
                      <td>{{ d.email }}</td>
                      <td>{{ d.casos_count }}</td>
                      <td>{{ d.practicas_count }}</td>
                      <td>{{ d.estudiantes_count }}</td>
                      <td>{{ d.grupos_count }}</td>
                      <td>{{ d.materias_count }}</td>
                      <td>
                        <span class="badge" [class]="d.is_active ? 'badge badge--activo' : 'badge badge--inactivo'">
                          {{ d.is_active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>{{ d.date_joined | date:'shortDate' }}</td>
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
export class AdminDocentes implements OnInit {
  private readonly servicio = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly docentes = signal<DocenteAdmin[]>([]);
  readonly filtroTexto = signal('');
  readonly filtroEstado = signal<'' | 'activo' | 'inactivo'>('');

  readonly activos = computed(() => this.docentes().filter((d) => d.is_active).length);
  readonly totalCasos = computed(() => this.docentes().reduce((a, d) => a + d.casos_count, 0));
  readonly totalPracticas = computed(() => this.docentes().reduce((a, d) => a + d.practicas_count, 0));

  readonly filtrados = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();
    return this.docentes().filter((d) => {
      if (est === 'activo' && !d.is_active) return false;
      if (est === 'inactivo' && d.is_active) return false;
      if (!txt) return true;
      return (
        d.nombre_completo.toLowerCase().includes(txt) ||
        d.email.toLowerCase().includes(txt) ||
        d.username.toLowerCase().includes(txt)
      );
    });
  });

  ngOnInit(): void {
    this.servicio.adminDocentes().subscribe({
      next: (rows) => {
        this.docentes.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los docentes.', 'OK', { duration: 3500 });
      },
    });
  }
}
