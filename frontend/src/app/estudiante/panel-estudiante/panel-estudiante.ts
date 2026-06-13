import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EstadoPracticaEstudiante } from '../../core/models/estudiante-session.model';
import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

@Component({
  selector: 'app-panel-estudiante',
  imports: [DatePipe, RouterLink, EstudianteShellComponent],
  templateUrl: './panel-estudiante.html',
  styleUrl: './panel-estudiante.scss',
})
export class PanelEstudianteComponent {
  private readonly session = inject(EstudianteSessionService);
  private readonly router = inject(Router);

  readonly nombre = this.session.nombreEstudiante;
  readonly practicas = this.session.practicas;

  readonly pendientes = computed(() =>
    this.practicas().filter((p) => p.progreso.estado === 'no_iniciada'),
  );
  readonly enCurso = computed(() =>
    this.practicas().filter((p) => p.progreso.estado === 'en_progreso'),
  );
  readonly completadas = computed(() =>
    this.practicas().filter((p) => p.progreso.estado === 'completada'),
  );

  abrirPractica(practicaId: number): void {
    this.session.seleccionarPractica(practicaId);
    this.router.navigate(['/estudiante/practicas', practicaId]);
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
}
