import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EventoActividad, ExtrasService } from '../core/services/extras.service';

@Component({
  selector: 'app-admin-actividad',
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
        <h1><em>Actividad</em> del sistema</h1>
        <p class="hero-glass__meta">Registro operativo de eventos en la plataforma</p>
      </header>

      <section class="panel">
        <div class="panel__toolbar">
          <div class="toolbar">
            <div class="toolbar__filters">
              <input type="search" placeholder="Buscar…" [ngModel]="filtroTexto()" (ngModelChange)="filtroTexto.set($event)" />
              <select [ngModel]="filtroTipo()" (ngModelChange)="filtroTipo.set($event)">
                <option value="">Todos los eventos</option>
                @for (t of tiposEvento(); track t) {
                  <option [value]="t">{{ etiquetaTipo(t) }}</option>
                }
              </select>
            </div>
          </div>
        </div>
        <div class="panel__body">
          @if (loading()) {
            <mat-progress-bar mode="indeterminate" />
          } @else if (filtrados().length === 0) {
            <div class="empty-state-mockup">
              <strong>Sin eventos registrados</strong>
              Aún no hay actividad reciente en el sistema.
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Detalle</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of filtrados(); track e.fecha + e.tipo + e.referencia_id) {
                    <tr>
                      <td>{{ e.fecha | date:'short' }}</td>
                      <td><span class="badge badge--activo">{{ e.tipo_display }}</span></td>
                      <td>{{ e.titulo }}</td>
                      <td>{{ e.actor_nombre }}</td>
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
export class AdminActividad implements OnInit {
  private readonly servicio = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly eventos = signal<EventoActividad[]>([]);
  readonly filtroTexto = signal('');
  readonly filtroTipo = signal('');

  readonly tiposEvento = computed(() =>
    [...new Set(this.eventos().map((e) => e.tipo))].sort(),
  );

  readonly filtrados = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const tipo = this.filtroTipo();
    return this.eventos().filter((e) => {
      if (tipo && e.tipo !== tipo) return false;
      if (!txt) return true;
      return (
        e.titulo.toLowerCase().includes(txt) ||
        e.actor_nombre.toLowerCase().includes(txt) ||
        e.tipo_display.toLowerCase().includes(txt)
      );
    });
  });

  ngOnInit(): void {
    this.servicio.adminActividad(100).subscribe({
      next: (rows) => {
        this.eventos.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar la actividad.', 'OK', { duration: 3500 });
      },
    });
  }

  etiquetaTipo(tipo: string): string {
    return this.eventos().find((e) => e.tipo === tipo)?.tipo_display ?? tipo;
  }
}
