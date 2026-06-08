import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';

export interface CorreoInvitacionesDialogData {
  /** guardar = menú perfil; enviar = flujo dentro de la práctica */
  modo?: 'guardar' | 'enviar';
  titulo?: string;
  boton?: string;
}

@Component({
  selector: 'app-correo-invitaciones-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="mockup-dialog__shell">
      <h2 class="mockup-dialog__title">{{ titulo }}</h2>
      <p class="dialog-hint">
        <strong>¿Para qué sirve esto?</strong> Cuando autorizas un estudiante en una
        práctica, el sistema le envía un correo con su <strong>código de acceso</strong>.
        Ese correo sale desde <strong>tu propia cuenta Gmail</strong>
        (<em>{{ email }}</em>), no desde un servidor del sistema. Así el estudiante
        ve el mensaje firmado por ti.
      </p>
      <p class="dialog-hint">
        Google exige una <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">contraseña de aplicación</a>
        (16 caracteres) para que apps externas envíen desde tu Gmail. La generas
        una vez en tu cuenta de Google y la pegas aquí.
        @if (modo === 'enviar' && yaConfigurado) {
          <br><strong>Ya tienes una guardada</strong>: deja vacío para reutilizarla o escribe una nueva.
        }
      </p>
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <mat-form-field appearance="outline" class="full">
        <mat-label>Contraseña de aplicación Gmail (16 caracteres)</mat-label>
        <input matInput type="password" [(ngModel)]="clave" autocomplete="off" placeholder="abcd efgh ijkl mnop" />
      </mat-form-field>
      <p class="dialog-tip">
        💡 En modo de desarrollo (sin Gmail real), los correos se imprimen en los logs
        del backend en lugar de enviarse. No necesitas configurar nada para probar.
      </p>
      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primary" [disabled]="!puedeConfirmar() || loading()" (click)="confirmar()">
          {{ boton }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-hint { font-size: 0.84rem; color: var(--app-slate); line-height: 1.55; margin: 0 0 0.8rem; }
    .dialog-tip {
      font-size: 0.78rem; color: var(--app-slate); line-height: 1.45;
      background: rgba(13, 148, 136, 0.08);
      border-left: 3px solid var(--app-teal, #0d9488);
      padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0.5rem 0 1rem;
    }
    .full { width: 100%; }
  `],
})
export class CorreoInvitacionesDialog {
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CorreoInvitacionesDialog, string | null>);
  private readonly data = inject<CorreoInvitacionesDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly loading = signal(false);
  readonly modo = this.data?.modo ?? 'guardar';
  readonly titulo = this.data?.titulo ?? (this.modo === 'enviar'
    ? 'Enviar invitaciones por correo'
    : 'Correo para invitaciones');
  readonly boton = this.data?.boton ?? (this.modo === 'enviar' ? 'Enviar correo' : 'Guardar');
  readonly email = this.auth.usuario()?.email ?? '';
  readonly yaConfigurado = this.auth.usuario()?.correo_smtp_configurado === true;

  clave = '';

  puedeConfirmar(): boolean {
    if (this.modo === 'enviar' && this.yaConfigurado && !this.clave.trim()) return true;
    return this.clave.trim().length >= 8;
  }

  confirmar(): void {
    if (this.modo === 'guardar') {
      if (!this.clave.trim()) return;
      this.loading.set(true);
      this.auth.configurarCorreoInvitaciones(this.clave.trim()).subscribe({
        next: () => {
          this.snackBar.open('Correo configurado.', 'OK', { duration: 3500 });
          this.dialogRef.close(this.clave.trim());
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.correo_smtp_password?.[0] || 'No se pudo guardar.';
          this.snackBar.open(msg, 'OK', { duration: 4000 });
        },
      });
      return;
    }
    this.dialogRef.close(this.clave.trim());
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
