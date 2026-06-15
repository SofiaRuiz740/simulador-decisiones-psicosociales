import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EstadoPracticaEstudiante, PracticaEstudianteActiva } from '../../core/models/estudiante-session.model';
import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { resolverCasoNarrativoId } from '../../core/utils/caso-narrativo.util';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

type VistaPracticas = 'todas' | 'pendientes' | 'curso' | 'completadas';

@Component({
  selector: 'app-mis-practicas',
  imports: [DatePipe, RouterLink, EstudianteShellComponent],
  templateUrl: './mis-practicas.html',
  styleUrl: './mis-practicas.scss',
})
export class MisPracticasComponent {
  private readonly session = inject(EstudianteSessionService);
  private readonly router = inject(Router);

  readonly practicas = this.session.practicas;
  readonly vista = signal<VistaPracticas>('todas');

  readonly vistas = [
    { id: 'todas' as const, label: 'Todas' },
    { id: 'pendientes' as const, label: 'Pendientes' },
    { id: 'curso' as const, label: 'En curso' },
    { id: 'completadas' as const, label: 'Completadas' },
  ];

  readonly filtradas = computed(() => {
    const v = this.vista();
    const items = this.practicas();
    if (v === 'todas') return items;
    if (v === 'pendientes') return items.filter((p) => p.progreso.estado === 'no_iniciada');
    if (v === 'curso') return items.filter((p) => p.progreso.estado === 'en_progreso');
    return items.filter((p) => p.progreso.estado === 'completada');
  });

  vistaLabel(): string {
    const map: Record<VistaPracticas, string> = {
      todas: 'asignadas',
      pendientes: 'pendientes',
      curso: 'en curso',
      completadas: 'completadas',
    };
    return map[this.vista()];
  }

  etiquetaEstado(estado: EstadoPracticaEstudiante): string {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En curso';
      default:
        return 'Pendiente';
    }
  }

  badgeClass(estado: EstadoPracticaEstudiante): string {
    switch (estado) {
      case 'completada':
        return 'badge badge--finalizado';
      case 'en_progreso':
        return 'badge badge--en-curso';
      default:
        return 'badge badge--pendiente';
    }
  }

  rutaSimulacion(p: PracticaEstudianteActiva): string {
    return resolverCasoNarrativoId(p) === 'violencia-intrafamiliar'
      ? 'simulacion'
      : 'simulacion-presentacion';
  }

  abrirPractica(practicaId: number): void {
    this.session.seleccionarPractica(practicaId);
    this.router.navigate(['/estudiante/practicas', practicaId]);
  }
}
