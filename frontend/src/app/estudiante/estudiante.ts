import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { Rol } from '../core/models/usuario.model';
import { EstudianteSessionService } from '../core/services/estudiante-session.service';
import { PracticasService } from '../core/services/practicas.service';
import { mensajeErrorHttp } from '../core/utils/http-error';

@Component({
  selector: 'app-estudiante',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressBarModule],
  templateUrl: './estudiante.html',
  styleUrl: './estudiante.scss',
})
export class Estudiante implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly practicas = inject(PracticasService);
  private readonly session = inject(EstudianteSessionService);
  private readonly router = inject(Router);

  readonly appName = environment.appName;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sesionActiva = this.auth.isAuthenticated;

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (this.session.autenticado() && !this.auth.isAuthenticated()) {
      this.auth.clearLocalSession();
      return;
    }

    if (this.auth.isAuthenticated() && this.auth.hasRol(Rol.Estudiante)) {
      void this.router.navigateByUrl('/panel-estudiante');
    }
  }

  ingresar() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const correo = this.form.controls.correo.value.toLowerCase().trim();
    const codigo = this.form.controls.codigo.value.toUpperCase().trim();

    this.practicas.accesoEstudiante(correo, codigo).subscribe({
      next: (res) => {
        this.auth.establecerSesionEstudiante(res);
        this.session.registrarAcceso(res);
        void this.router.navigateByUrl('/panel-estudiante').then((ok) => {
          this.loading.set(false);
          if (!ok) {
            this.error.set('No pudimos abrir tu panel. Recarga la página e intenta de nuevo.');
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          mensajeErrorHttp(
            err,
            'Los datos no coinciden. Verifica tu correo y el código que te dio tu docente.',
            'No pudimos conectar con el servidor. Si usas Docker, abre http://localhost:8080 o verifica que el backend esté en marcha.',
          ),
        );
      },
    });
  }
}
