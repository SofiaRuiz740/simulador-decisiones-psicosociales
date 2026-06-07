import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-docentes',
  imports: [CommonModule],
  template: `
    <section class="module page">
      <header class="hero-glass">
        <h1><em>Docentes</em></h1>
        <p class="hero-glass__meta">Supervisión de perfiles docentes en la plataforma</p>
      </header>
      <section class="panel">
        <div class="panel__body">
          <div class="empty-state-mockup">
            <strong>Sin listado de docentes</strong>
            El backend aún no expone la gestión institucional de docentes.
          </div>
        </div>
      </section>
    </section>
  `,
})
export class AdminDocentes {}
