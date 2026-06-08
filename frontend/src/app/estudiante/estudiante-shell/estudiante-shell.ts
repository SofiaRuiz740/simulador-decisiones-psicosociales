import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { EstudianteSessionService } from '../../core/services/estudiante-session.service';

@Component({
  selector: 'app-estudiante-shell',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  templateUrl: './estudiante-shell.html',
  styleUrl: './estudiante-shell.scss',
})
export class EstudianteShellComponent {
  readonly titulo = input('Estudiante');
  readonly estudianteSession = inject(EstudianteSessionService);

  cerrarSesion(): void {
    this.estudianteSession.cerrarSesion();
    window.location.href = '/estudiante';
  }
}
