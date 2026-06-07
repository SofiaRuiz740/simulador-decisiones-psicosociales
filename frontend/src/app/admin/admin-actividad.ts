import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-actividad',
  imports: [CommonModule],
  template: `
    <section class="module page">
      <header class="hero-glass">
        <h1><em>Actividad</em> del sistema</h1>
        <p class="hero-glass__meta">Registro operativo de eventos en la plataforma</p>
      </header>
      <section class="panel">
        <div class="panel__body">
          <div class="empty-state-mockup">
            <strong>Sin eventos registrados</strong>
            La bitácora de actividad se habilitará cuando el backend la exponga.
          </div>
        </div>
      </section>
    </section>
  `,
})
export class AdminActividad {}
