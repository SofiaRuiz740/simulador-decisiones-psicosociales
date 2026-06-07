import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth/auth.service';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-estudiante',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressBarModule],
  templateUrl: './estudiante.html',
  styleUrl: './estudiante.scss',
})
export class Estudiante {
  private readonly fb = inject(FormBuilder);
  private readonly practicas = inject(PracticasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly appName = environment.appName;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required]],
  });

  ingresar() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    const correo = this.form.controls.correo.value.toLowerCase().trim();
    const codigo = this.form.controls.codigo.value.toUpperCase().trim();

    this.practicas.accesoEstudiante(correo, codigo).subscribe({
      next: (res) => {
        this.auth.establecerSesionEstudiante(res);
        this.router.navigate(['/estudiante/simulacion']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const msg =
          err.error?.non_field_errors?.[0] ||
          err.error?.correo?.[0] ||
          err.error?.codigo?.[0] ||
          err.error?.detail ||
          (err.status === 0
            ? 'No pudimos conectar en este momento. Intenta de nuevo en unos minutos.'
            : 'Los datos no coinciden. Verifica tu correo y el código que te dio tu docente.');
        this.error.set(msg);
      },
    });
  }
}
