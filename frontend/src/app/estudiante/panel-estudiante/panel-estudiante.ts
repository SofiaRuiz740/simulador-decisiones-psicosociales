import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { CATALOGO_CASOS_NARRATIVOS } from '../../core/utils/caso-narrativo.util';
import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

@Component({
  selector: 'app-panel-estudiante',
  imports: [
    DatePipe,
    NgClass,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EstudianteShellComponent,
  ],
  templateUrl: './panel-estudiante.html',
  styleUrl: './panel-estudiante.scss',
})
export class PanelEstudianteComponent {
  private readonly session = inject(EstudianteSessionService);
  private readonly router = inject(Router);

  readonly nombre = this.session.nombreEstudiante;
  readonly practicas = this.session.practicas;
  readonly proximasPracticas = CATALOGO_CASOS_NARRATIVOS.filter((c) => !c.disponible);

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly hoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  readonly resumen = computed(() => {
    const lista = this.practicas();
    const activas = lista.filter((p) => p.progreso.estado !== 'completada').length;
    const completadas = lista.filter((p) => p.progreso.estado === 'completada').length;
    return { total: lista.length, activas, completadas };
  });

  etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En progreso';
      default:
        return 'Sin iniciar';
    }
  }

  abrirPractica(practicaId: number): void {
    this.session.seleccionarPractica(practicaId);
    this.router.navigate(['/estudiante/practicas', practicaId]);
  }
}
