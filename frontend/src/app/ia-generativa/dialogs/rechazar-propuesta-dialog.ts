import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-rechazar-propuesta-dialog',
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="dlg">
      <header class="dlg-head">
        <span class="ic"><mat-icon>thumb_down</mat-icon></span>
        <div>
          <h2>Rechazar propuesta</h2>
          <p>Cuéntale al asistente por qué para que aprenda. Es opcional.</p>
        </div>
      </header>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>Motivo del rechazo (opcional)</mat-label>
        <textarea
          matInput
          rows="4"
          [(ngModel)]="motivo"
          maxlength="600"
          placeholder="Ej: La narrativa no encaja con el contexto académico que necesito.">
        </textarea>
        <mat-hint align="end">{{ motivo.length }}/600</mat-hint>
      </mat-form-field>

      <footer class="dlg-foot">
        <button mat-stroked-button (click)="cancelar()" class="btn-cancel">
          Cancelar
        </button>
        <button mat-flat-button (click)="confirmar()" class="btn-confirm">
          <mat-icon>thumb_down</mat-icon>
          Rechazar propuesta
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .dlg {
      display: flex; flex-direction: column;
      gap: 1rem;
      min-width: 340px;
      max-width: 480px;
      padding: 1.5rem 1.6rem 1.3rem;
      background: white;
    }
    .dlg-head {
      display: flex; gap: 0.85rem; align-items: flex-start;

      .ic {
        flex-shrink: 0;
        width: 42px; height: 42px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--app-danger) 14%, transparent);
        color: var(--app-danger);
        display: inline-flex; align-items: center; justify-content: center;
        mat-icon { font-size: 22px; width: 22px; height: 22px; }
      }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.2rem;
        color: var(--app-ink);
        letter-spacing: -0.01em;
      }
      p {
        margin: 0.2rem 0 0;
        color: var(--app-slate);
        font-size: 0.88rem;
        line-height: 1.45;
      }
    }
    .campo { width: 100%; }

    .dlg-foot {
      display: flex; justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.25rem;

      button {
        height: 42px !important;
        padding: 0 1.1rem !important;
        border-radius: var(--radius-md) !important;
        font-weight: 700 !important;
        display: inline-flex !important; align-items: center;
        gap: 0.35rem;
      }
      .btn-cancel {
        color: var(--app-slate) !important;
        border: 1px solid var(--app-line) !important;
      }
      .btn-confirm {
        background: var(--app-danger) !important;
        color: white !important;
        box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
        mat-icon { font-size: 17px; width: 17px; height: 17px; }
      }
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
