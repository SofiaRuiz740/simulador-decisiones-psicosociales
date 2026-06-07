import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-mis-practicas',
  imports: [CommonModule],
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
                <tr>
                  <td [attr.colspan]="7">
                    <div class="empty-state-mockup empty-state-mockup--compact">
                      <strong>Sin prácticas {{ vistaLabel() }}</strong>
                      No hay registros en esta categoría. El listado se cargará cuando el backend exponga «mis prácticas».
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  `,
})
export class MisPracticas {
  readonly vista = signal<'todas' | 'pendientes' | 'curso' | 'completadas'>('todas');

  readonly vistas = [
    { id: 'todas' as const, label: 'Todas' },
    { id: 'pendientes' as const, label: 'Pendientes' },
    { id: 'curso' as const, label: 'En curso' },
    { id: 'completadas' as const, label: 'Completadas' },
  ];

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
