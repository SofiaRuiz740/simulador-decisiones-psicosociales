import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { MisPracticaEstudiante } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';
import { PsychologyBgDecor } from '../shared/components/illustrations/psychology-bg-decor/psychology-bg-decor';

@Component({
  selector: 'app-panel-estudiante-inicio',
  imports: [CommonModule, RouterLink, PsychologyBgDecor],
  template: `
    <section class="module page">
      <header class="hero-glass hero-glass--with-meta hero-glass--decor">
        <app-psychology-bg-decor variant="dashboard" />
        <h1>Hola, <em>{{ nombre() }}</em></h1>
        <p class="hero-glass__meta">Panel del estudiante</p>
      </header>

      <section class="metrics metrics--compact">
        <article class="metric metric--accent">
          <div class="metric__value">{{ pendientes().length }}</div>
          <div class="metric__label">Pendientes</div>
        </article>
        <article class="metric metric--teal">
          <div class="metric__value">{{ enCurso().length }}</div>
          <div class="metric__label">En curso</div>
        </article>
        <article class="metric">
          <div class="metric__value">{{ completadas().length }}</div>
          <div class="metric__label">Completadas</div>
        </article>
        <article class="metric">
          <div class="metric__value">{{ practicas().length }}</div>
          <div class="metric__label">Total</div>
        </article>
      </section>

      <section class="dash-minimal">
        <div class="dash-minimal__head">
          <h2>Pendientes</h2>
          <a routerLink="/panel-estudiante/practicas" class="btn-ghost">Ver todas</a>
        </div>
        @if (pendientes().length === 0) {
          <p class="dash-list__empty">No tienes prácticas pendientes. Cuando el docente te autorice, aparecerán aquí.</p>
        } @else {
          <ul class="dash-list">
            @for (p of pendientes().slice(0, 3); track p.autorizacion_id) {
              <li>
                <strong>{{ p.practica_nombre }}</strong>
                <span>{{ p.caso_nombre }} · Código {{ p.codigo_acceso }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel">
        <div class="panel__toolbar">
          <div class="toolbar">
            <h2 class="panel-title">Continuar simulación</h2>
          </div>
        </div>
        <div class="panel__body">
          @if (enCurso().length === 0) {
            <div class="empty-state-mockup empty-state-mockup--compact empty-state-mockup--decor">
              <app-psychology-bg-decor variant="panel-zen" />
              <strong>Sin simulación en curso</strong>
              Usa tu código de acceso en la pantalla de ingreso del simulador.
              <a routerLink="/estudiante" class="btn-ghost" style="margin-top:12px;display:inline-flex">Acceder con código</a>
            </div>
          } @else {
            <div class="empty-state-mockup empty-state-mockup--compact">
              <strong>{{ enCurso()[0].practica_nombre }}</strong>
              Progreso {{ enCurso()[0].progreso_pct }}% · Código {{ enCurso()[0].codigo_acceso }}
              <a routerLink="/estudiante/simulacion" class="btn-primary" style="margin-top:12px;display:inline-flex">Continuar</a>
            </div>
          }
        </div>
      </section>
    </section>
  `,
  styles: [`
    .panel-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--app-ink);
    }
    .dash-list__empty {
      margin: 0;
      font-size: 0.84rem;
      color: var(--app-slate);
      line-height: 1.55;
    }

    .hero-glass--decor {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      padding: 1.5rem 1.75rem;
      background: linear-gradient(120deg, #fbf3ec 0%, #f4eefc 55%, #ece4fb 100%);

      h1,
      .hero-glass__meta {
        position: relative;
        z-index: 1;
      }
    }

    .empty-state-mockup--decor {
      position: relative;
      overflow: hidden;
      border-radius: 14px;

      > * {
        position: relative;
        z-index: 1;
      }
    }
  `],
})
export class PanelEstudianteInicio implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly practicasSrv = inject(PracticasService);

  readonly practicas = signal<MisPracticaEstudiante[]>([]);

  readonly pendientes = computed(() =>
    this.practicas().filter((p) => p.estado === 'NO_INICIADA' || p.estado_display === 'Autorizado'),
  );
  readonly enCurso = computed(() => this.practicas().filter((p) => p.estado === 'EN_CURSO'));
  readonly completadas = computed(() =>
    this.practicas().filter((p) => p.estado === 'FINALIZADA' || p.estado === 'INCOMPLETA'),
  );

  ngOnInit(): void {
    this.practicasSrv.misPracticas().subscribe({
      next: (rows) => this.practicas.set(rows),
    });
  }

  nombre(): string {
    const u = this.auth.usuario();
    return u?.nombre_completo || u?.first_name || u?.username || 'Estudiante';
  }
}
