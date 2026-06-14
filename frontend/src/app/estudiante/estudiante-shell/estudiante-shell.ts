import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { EstudiantePanelWaves } from '../../shared/components/illustrations/estudiante-panel-waves/estudiante-panel-waves';
import { NavIcon } from '../../shared/components/nav-icon/nav-icon';

@Component({
  selector: 'app-estudiante-shell',
  imports: [RouterLink, RouterLinkActive, NavIcon, EstudiantePanelWaves],
  templateUrl: './estudiante-shell.html',
  styleUrl: './estudiante-shell.scss',
})
export class EstudianteShellComponent {
  readonly titulo = input('Panel del estudiante');
  readonly estudianteSession = inject(EstudianteSessionService);

  readonly iniciales = computed(() => {
    const nombre = this.estudianteSession.nombreEstudiante();
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (nombre.slice(0, 2) || 'ES').toUpperCase();
  });

  cerrarSesion(): void {
    this.estudianteSession.cerrarSesion();
    window.location.href = '/auth/login';
  }
}
