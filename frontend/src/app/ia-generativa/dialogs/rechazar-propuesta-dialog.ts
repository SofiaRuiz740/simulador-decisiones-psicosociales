import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-rechazar-propuesta-dialog',
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="mockup-dialog__shell mockup-dialog__shell--warn">
      <h2 class="mockup-dialog__title">Rechazar propuesta</h2>
      <p class="dialog-hint">Cuéntale al asistente por qué, para que aprenda. Es opcional.</p>

      <div class="form-group full">
        <label>Motivo del rechazo</label>
        <textarea rows="4" [(ngModel)]="motivo" maxlength="600"
          placeholder="Ej: La narrativa no encaja con el contexto académico que necesito."></textarea>
        <span class="char-count">{{ motivo.length }}/600</span>
      </div>

      <div class="mockup-dialog__actions">
        <button type="button" class="btn-secondary" (click)="cancelar()">Cancelar</button>
        <button type="button" class="btn-danger" (click)="confirmar()">Rechazar propuesta</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-hint { margin: 0 0 1rem; font-size: 0.84rem; color: var(--app-slate); line-height: 1.5; }
    .char-count { font-size: 0.72rem; color: var(--app-muted); text-align: right; display: block; margin-top: 4px; }
    .btn-danger {
      padding: 0.65rem 1.1rem;
      border: none;
      border-radius: var(--radius-md);
      background: var(--app-danger);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
  `],
})
export class RechazarPropuestaDialog {
  private readonly dialogRef = inject(MatDialogRef<RechazarPropuestaDialog>);
  motivo = '';

  confirmar(): void {
    this.dialogRef.close({ motivo: this.motivo.trim() });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
