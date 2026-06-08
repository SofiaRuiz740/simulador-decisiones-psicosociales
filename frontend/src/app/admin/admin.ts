import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { AdminMetricas, EventoActividad, ExtrasService } from '../core/services/extras.service';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, DatePipe, RouterLink, MatProgressBarModule],
  template: `
    <section class="module page">
      <header class="hero-glass">
        <h1>Panel <em>institucional</em></h1>
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else if (metricas(); as m) {
        <section class="metrics metrics--compact">
          <article class="metric metric--teal">
            <div class="metric__value">{{ m.docentes }}</div>
            <div class="metric__label">Docentes</div>
          </article>
          <article class="metric">
            <div class="metric__value">{{ m.estudiantes }}</div>
            <div class="metric__label">Estudiantes</div>
          </article>
          <article class="metric metric--accent">
            <div class="metric__value">{{ m.casos }}</div>
            <div class="metric__label">Casos</div>
          </article>
          <article class="metric">
            <div class="metric__value">{{ practicasActivas() }}</div>
            <div class="metric__label">Prácticas activas</div>
          </article>
        </section>

        <section class="dash-minimal">
          <div class="dash-minimal__head">
            <h2>Actividad reciente</h2>
            <a routerLink="/admin/actividad" class="btn-ghost">Ver todo</a>
          </div>
          @if (actividad().length === 0) {
            <div class="empty-state-mockup">Sin actividad reciente registrada.</div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Evento</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of actividad(); track e.fecha + e.tipo + e.referencia_id) {
                    <tr>
                      <td>{{ e.fecha | date:'short' }}</td>
                      <td>{{ e.tipo_display }}</td>
                      <td>{{ e.titulo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="panel">
          <div class="panel__toolbar">
            <div class="toolbar">
              <h2 class="panel-title">Prácticas por estado</h2>
              <a routerLink="/practicas" class="btn-ghost">Ver prácticas</a>
            </div>
          </div>
          <div class="panel__body">
            @if (estadosLista().length === 0) {
              <div class="empty-state-mockup">Aún no hay prácticas en el sistema.</div>
            } @else {
              <div class="bars">
                @for (e of estadosLista(); track e.key) {
                  <div class="bar-row" [attr.data-estado]="e.key">
                    <div class="bar-label">
                      <span>{{ etiquetaEstado(e.key) }}</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" [style.width.%]="pctEstado(e.value)"></div>
                    </div>
                    <strong class="bar-num">{{ e.value }}</strong>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    .page { padding-bottom: 0; }

    .panel-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--app-ink);
    }

    .bars {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      padding: 1.25rem 1.5rem;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 180px 1fr 60px;
      align-items: center;
      gap: 0.85rem;

      .bar-label {
        font-weight: 600;
        font-size: 0.92rem;
        color: var(--app-text);
      }

      .bar-track {
        height: 10px;
        background: rgba(155, 114, 243, 0.08);
        border-radius: 999px;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        background: var(--grad-btn);
        transition: width 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
      }

      .bar-num {
        text-align: right;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.05rem;
        color: var(--app-purple-dark);
      }

      &[data-estado="EN_CURSO"] .bar-fill { background: linear-gradient(90deg, #a87ef0, var(--app-purple)); }
      &[data-estado="FINALIZADA"] .bar-fill { background: linear-gradient(90deg, #80cbc4, var(--app-teal)); }
      &[data-estado="CANCELADA"] .bar-fill { background: linear-gradient(90deg, #ef5350, #b71c1c); }
      &[data-estado="SIN_INICIAR"] .bar-fill { background: linear-gradient(90deg, #bdbdbd, #9e9e9e); }
    }

    @media (max-width: 720px) {
      .bar-row { grid-template-columns: 130px 1fr 40px; gap: 0.5rem; }
    }
  `],
})
export class Admin implements OnInit {
  private readonly servicio = inject(ExtrasService);

  readonly loading = signal(true);
  readonly metricas = signal<AdminMetricas | null>(null);
  readonly actividad = signal<EventoActividad[]>([]);

  readonly practicasActivas = computed(() => {
    const m = this.metricas();
    if (!m) return 0;
    const est = m.practicas_por_estado;
    return (est['SIN_INICIAR'] ?? 0) + (est['EN_CURSO'] ?? 0);
  });

  ngOnInit() {
    this.servicio.adminMetricas().subscribe({
      next: (m) => { this.metricas.set(m); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.servicio.adminActividad(8).subscribe({
      next: (rows) => this.actividad.set(rows),
    });
  }

  estadosLista() {
    const m = this.metricas();
    if (!m) return [];
    return Object.entries(m.practicas_por_estado).map(([key, value]) => ({ key, value }));
  }

  pctEstado(value: number): number {
    const lista = this.estadosLista();
    const max = Math.max(...lista.map((e) => e.value));
    if (max <= 0) return 0;
    return Math.round((value / max) * 100);
  }

  etiquetaEstado(k: string): string {
    return ({
      SIN_INICIAR: 'Sin iniciar',
      EN_CURSO: 'En curso',
      FINALIZADA: 'Finalizadas',
      CANCELADA: 'Canceladas',
    } as Record<string, string>)[k] || k;
  }
}
