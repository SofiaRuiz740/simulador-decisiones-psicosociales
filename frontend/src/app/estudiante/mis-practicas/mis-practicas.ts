import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

@Component({
  selector: 'app-mis-practicas',
  imports: [
    DatePipe,
    NgClass,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EstudianteShellComponent,
  ],
  templateUrl: './mis-practicas.html',
  styleUrl: './mis-practicas.scss',
})
export class MisPracticasComponent {
  private readonly session = inject(EstudianteSessionService);
  private readonly router = inject(Router);

  readonly practicas = this.session.practicas;

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
