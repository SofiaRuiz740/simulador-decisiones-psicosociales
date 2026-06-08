import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type ConfirmVariant = 'danger' | 'warn' | 'info';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  variant?: ConfirmVariant;
  icono?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="dlg" [attr.data-variant]="variant">
      <header class="head">
        <span class="ic">
          <mat-icon>{{ data.icono || iconoPorVariant() }}</mat-icon>
        </span>
        <div class="text">
          <h2>{{ data.titulo }}</h2>
          <p>{{ data.mensaje }}</p>
        </div>
      </header>

      <footer class="foot">
        <button mat-stroked-button (click)="cancelar()" class="btn-cancel">
          {{ data.textoCancelar || 'Cancelar' }}
        </button>
        <button mat-flat-button (click)="confirmar()" class="btn-confirm">
          <mat-icon>{{ iconoConfirmar() }}</mat-icon>
          {{ data.textoConfirmar || 'Confirmar' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .dlg {
      display: flex; flex-direction: column;
      gap: 1.25rem;
      min-width: 340px;
      max-width: 480px;
      padding: 1.5rem 1.6rem 1.3rem;
      background: white;
    }

    .head {
      display: flex; align-items: flex-start; gap: 0.85rem;

      .ic {
        flex-shrink: 0;
        width: 44px; height: 44px;
        border-radius: var(--radius-md);
        display: inline-flex; align-items: center; justify-content: center;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      .text { display: flex; flex-direction: column; gap: 0.25rem; }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.2rem;
        color: var(--app-ink);
        letter-spacing: -0.01em;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: var(--app-slate);
        font-size: 0.92rem;
        line-height: 1.5;
      }
    }

    .foot {
      display: flex; justify-content: flex-end; gap: 0.5rem;

      button {
        height: 42px !important;
        padding: 0 1.1rem !important;
        border-radius: var(--radius-md) !important;
        font-weight: 700 !important;
        display: inline-flex !important; align-items: center; gap: 0.35rem;
      }
      .btn-cancel {
        color: var(--app-slate) !important;
        border: 1px solid var(--app-line) !important;
      }
      .btn-confirm {
        color: white !important;
        mat-icon { font-size: 17px; width: 17px; height: 17px; }
      }
    }

    /* Variants ----- */
    .dlg[data-variant="danger"] {
      .ic { background: color-mix(in srgb, var(--app-danger) 14%, transparent); color: var(--app-danger); }
      .btn-confirm {
        background: var(--app-danger) !important;
        box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25);
      }
    }
    .dlg[data-variant="warn"] {
      .ic { background: color-mix(in srgb, var(--app-warn) 16%, transparent); color: var(--app-warn); }
      .btn-confirm {
        background: var(--app-warn) !important;
        box-shadow: 0 8px 20px rgba(245, 158, 11, 0.28);
      }
    }
    .dlg[data-variant="info"] {
      .ic { background: color-mix(in srgb, var(--app-deep) 12%, transparent); color: var(--app-deep); }
      .btn-confirm {
        background: var(--app-deep) !important;
        box-shadow: var(--shadow-glow);
      }
    }
  `],
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ConfirmDialog>);

  get variant(): ConfirmVariant {
    return this.data.variant || 'info';
  }

  iconoPorVariant(): string {
    return this.variant === 'danger' ? 'warning'
      : this.variant === 'warn' ? 'priority_high'
      : 'help_outline';
  }

  iconoConfirmar(): string {
    return this.variant === 'danger' ? 'delete' : 'check';
  }

  confirmar(): void { this.ref.close(true); }
  cancelar(): void { this.ref.close(false); }
}
