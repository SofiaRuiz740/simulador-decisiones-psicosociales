import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const confirm = group.get('password_confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-auth-entry',
  imports: [CommonModule, ReactiveFormsModule, MatProgressBarModule, RouterLink],
  templateUrl: './auth-entry.html',
  styleUrl: './auth-entry.scss',
})
export class AuthEntry implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<'login' | 'register'>('login');
  readonly loading = signal(false);
  readonly loginError = signal<string | null>(null);
  readonly hidePassword = signal(true);
  readonly hidePasswordConfirm = signal(true);
  readonly serverErrors = signal<Record<string, string[]>>({});

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly registerForm = this.fb.nonNullable.group(
    {
      nombre_completo: ['', [Validators.required, Validators.maxLength(300)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    const register = this.route.snapshot.queryParamMap.get('register');
    if (register === '1' || register === 'true') {
      this.mode.set('register');
    }
  }

  showLogin(): void {
    this.mode.set('login');
    this.serverErrors.set({});
  }

  showRegister(): void {
    this.mode.set('register');
    this.loginError.set(null);
  }

  submitLogin(): void {
    if (this.loginForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.loginError.set(null);
    const { username, password } = this.loginForm.getRawValue();

    this.auth.loginDocente(username, password).subscribe({
      next: () => {
        this.router.navigateByUrl(this.auth.dashboardDeRol(this.auth.rol()));
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loginError.set(this.extractLoginError(err));
      },
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.serverErrors.set({});
    const v = this.registerForm.getRawValue();

    this.auth.registroDocente(this.mapToApi(v)).subscribe({
      next: () => {
        this.router.navigateByUrl(this.auth.dashboardDeRol(this.auth.rol()));
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

  private extractLoginError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    if (err.status === 401) return 'Usuario o contraseña incorrectos.';
    const detail = err.error?.detail;
    if (typeof detail === 'string') return detail;
    return 'Error inesperado al iniciar sesión. Intenta de nuevo.';
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
