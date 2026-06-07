import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

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
          <div class="metric__value">—</div>
          <div class="metric__label">Pendientes</div>
        </article>
        <article class="metric metric--teal">
          <div class="metric__value">—</div>
          <div class="metric__label">En curso</div>
        </article>
        <article class="metric">
          <div class="metric__value">—</div>
          <div class="metric__label">Completadas</div>
        </article>
        <article class="metric">
          <div class="metric__value">—</div>
          <div class="metric__label">Total</div>
        </article>
      </section>

      <section class="dash-minimal">
        <div class="dash-minimal__head">
          <h2>Pendientes</h2>
          <a routerLink="/panel-estudiante/practicas" class="btn-ghost">Ver todas</a>
        </div>
        <p class="dash-list__empty">No tienes prácticas pendientes. Cuando el docente te autorice, aparecerán aquí.</p>
      </section>

      <section class="panel">
        <div class="panel__toolbar">
          <div class="toolbar">
            <h2 class="panel-title">Continuar simulación</h2>
          </div>
        </div>
        <div class="panel__body">
          <div class="empty-state-mockup empty-state-mockup--compact">
            <strong>Sin simulación en curso</strong>
            No tienes una práctica activa. Usa tu código de acceso si el docente ya te asignó una.
            <a routerLink="/estudiante" class="btn-ghost" style="margin-top:12px;display:inline-flex">Acceder con código</a>
          </div>
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
  `],
})
export class PanelEstudianteInicio {
  private readonly auth = inject(AuthService);

  nombre(): string {
    const u = this.auth.usuario();
    return u?.nombre_completo || u?.first_name || u?.username || 'Estudiante';
  }
}
