import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { MisPracticaEstudiante } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-panel-estudiante-inicio',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="module page">
      <header class="hero-glass">
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
              <li class="dash-list__item dash-list__item--stacked">
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
            <h2 class="panel-title">{{ tituloActividad() }}</h2>
          </div>
        </div>
        <div class="panel__body">
          @if (enCurso().length > 0) {
            <div class="empty-state-mockup empty-state-mockup--compact">
              <strong>{{ enCurso()[0].practica_nombre }}</strong>
              Progreso {{ enCurso()[0].progreso_pct }}% · {{ enCurso()[0].caso_nombre }}
              <a
                [routerLink]="['/estudiante/practicas', enCurso()[0].practica_id, 'simulacion']"
                class="btn-primary"
                style="margin-top:12px;display:inline-flex">
                Continuar simulación
              </a>
            </div>
          } @else if (pendientes().length > 0) {
            <div class="empty-state-mockup empty-state-mockup--compact">
              <strong>{{ pendientes()[0].practica_nombre }}</strong>
              {{ pendientes()[0].caso_nombre }} · Lista para comenzar
              <a
                [routerLink]="['/panel-estudiante/practicas', pendientes()[0].practica_id]"
                class="btn-primary"
                style="margin-top:12px;display:inline-flex">
                Comenzar práctica
              </a>
            </div>
          } @else if (completadas().length > 0) {
            <div class="empty-state-mockup empty-state-mockup--compact">
              <strong>Revisa tu retroalimentación</strong>
              Tienes {{ completadas().length }} práctica(s) completada(s). Consulta comentarios y rúbrica del docente.
              <a routerLink="/panel-estudiante/resultados" class="btn-primary" style="margin-top:12px;display:inline-flex">
                Ver resultados
              </a>
            </div>
          } @else {
            <div class="empty-state-mockup empty-state-mockup--compact">
              <strong>Sin prácticas asignadas</strong>
              Cuando tu docente te autorice, aparecerán en Mis prácticas.
              <a routerLink="/panel-estudiante/practicas" class="btn-ghost" style="margin-top:12px;display:inline-flex">
                Ir a mis prácticas
              </a>
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
    .dash-list__item--stacked {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    .dash-list__item--stacked strong {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--app-ink);
    }
    .dash-list__item--stacked span {
      font-size: 0.78rem;
      color: var(--app-slate);
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

  readonly tituloActividad = computed(() => {
    if (this.enCurso().length > 0) return 'Continuar simulación';
    if (this.pendientes().length > 0) return 'Próxima práctica';
    if (this.completadas().length > 0) return 'Resultados';
    return 'Mis prácticas';
  });

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
