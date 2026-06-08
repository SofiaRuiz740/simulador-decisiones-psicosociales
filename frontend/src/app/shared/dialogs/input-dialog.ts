import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface InputDialogData {
  titulo: string;
  mensaje?: string;
  label: string;
  placeholder?: string;
  hint?: string;
  inicial?: string;
  multiline?: boolean;
  rows?: number;
  icono?: string;
  required?: boolean;
  maxlength?: number;
  textoCancelar?: string;
  textoConfirmar?: string;
}

@Component({
  selector: 'app-input-dialog',
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="dlg">
      <header class="head">
        <span class="ic"><mat-icon>{{ data.icono || 'edit' }}</mat-icon></span>
        <div class="text">
          <h2>{{ data.titulo }}</h2>
          @if (data.mensaje) { <p>{{ data.mensaje }}</p> }
        </div>
      </header>

      <mat-form-field appearance="outline" class="campo">
        <mat-label>{{ data.label }}</mat-label>
        @if (data.multiline) {
          <textarea
            matInput
            [(ngModel)]="valor"
            [rows]="data.rows || 3"
            [placeholder]="data.placeholder || ''"
            [maxlength]="data.maxlength || 600">
          </textarea>
        } @else {
          <input
            matInput
            type="text"
            [(ngModel)]="valor"
            [placeholder]="data.placeholder || ''"
            [maxlength]="data.maxlength || 200"
            (keydown.enter)="confirmar()">
        }
        @if (data.hint) { <mat-hint>{{ data.hint }}</mat-hint> }
      </mat-form-field>

      <footer class="foot">
        <button mat-stroked-button (click)="cancelar()" class="btn-cancel">
          {{ data.textoCancelar || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          (click)="confirmar()"
          [disabled]="data.required && !valor.trim()"
          class="btn-confirm">
          <mat-icon>check</mat-icon>
          {{ data.textoConfirmar || 'Aceptar' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    .dlg {
      display: flex; flex-direction: column;
      gap: 0.85rem;
      min-width: 360px;
      max-width: 480px;
      padding: 1.5rem 1.6rem 1.3rem;
      background: white;
    }
    .head {
      display: flex; align-items: flex-start; gap: 0.85rem;

      .ic {
        flex-shrink: 0;
        width: 42px; height: 42px;
        border-radius: var(--radius-md);
        background: var(--app-accent-soft);
        color: var(--app-deep);
        display: inline-flex; align-items: center; justify-content: center;
        mat-icon { font-size: 22px; width: 22px; height: 22px; }
      }
      .text { display: flex; flex-direction: column; gap: 0.2rem; }
      h2 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        font-size: 1.15rem;
        color: var(--app-ink);
        letter-spacing: -0.01em;
      }
      p {
        margin: 0;
        color: var(--app-slate);
        font-size: 0.88rem;
        line-height: 1.45;
      }
    }

    .campo { width: 100%; }

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
        background: var(--app-deep) !important;
        color: white !important;
        box-shadow: var(--shadow-glow);
        mat-icon { font-size: 17px; width: 17px; height: 17px; }
        &:disabled { background: var(--app-slate) !important; box-shadow: none; opacity: 0.5; }
      }
    }
  `],
})
export class InputDialog {
  readonly data = inject<InputDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<InputDialog>);

  valor = this.data.inicial || '';

  confirmar(): void {
    if (this.data.required && !this.valor.trim()) return;
    this.ref.close(this.valor.trim());
  }
  cancelar(): void { this.ref.close(null); }
}
