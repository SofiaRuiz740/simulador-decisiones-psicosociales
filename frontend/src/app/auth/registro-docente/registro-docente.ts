import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const confirm = group.get('password_confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-registro-docente',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatProgressBarModule,
  ],
  templateUrl: './registro-docente.html',
  styleUrl: './registro-docente.scss',
})
export class RegistroDocente {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Formulario visual mockup (4 campos); se mapea al API en submit(). */
  readonly form = this.fb.nonNullable.group(
    {
      nombre_completo: ['', [Validators.required, Validators.maxLength(300)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  readonly loading = signal(false);
  readonly hidePassword = signal(true);
  readonly hidePasswordConfirm = signal(true);
  readonly serverErrors = signal<Record<string, string[]>>({});

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.serverErrors.set({});

    const v = this.form.getRawValue();
    this.auth.registroDocente(this.mapToApi(v)).subscribe({
      next: () => {
        const destino = this.auth.dashboardDeRol(this.auth.rol());
        this.router.navigateByUrl(destino);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverErrors.set(this.parseServerErrors(err));
      },
    });
  }

  fieldErrors(field: string): string[] {
    return this.serverErrors()[field] ?? [];
  }

  get hasGeneralError(): boolean {
    return 'non_field_errors' in this.serverErrors() || 'detail' in this.serverErrors();
  }

  generalError(): string {
    const errs = this.serverErrors();
    return errs['non_field_errors']?.[0] ?? errs['detail']?.[0] ?? '';
  }

  private mapToApi(v: {
    nombre_completo: string;
    email: string;
    password: string;
    password_confirm: string;
  }) {
    const trimmed = v.nombre_completo.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const first_name = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const last_name = spaceIdx === -1 ? trimmed : trimmed.slice(spaceIdx + 1).trim() || first_name;
    const local = v.email.split('@')[0] || 'docente';
    const username = local.toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 150);

    return {
      username,
      email: v.email.trim(),
      first_name,
      last_name,
      password: v.password,
      password_confirm: v.password_confirm,
    };
  }

  private parseServerErrors(err: HttpErrorResponse): Record<string, string[]> {
    if (err.status === 0) return { non_field_errors: ['No se pudo conectar con el servidor.'] };
    const body = err.error;
    if (!body || typeof body !== 'object') {
      return { non_field_errors: ['Error inesperado en el registro.'] };
    }
    const parsed: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(body)) {
      parsed[key] = Array.isArray(value) ? (value as string[]) : [String(value)];
    }
    return parsed;
  }
}
