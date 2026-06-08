import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

export interface CasePreviewOption {
  texto: string;
}

export interface CasePreviewData {
  titulo: string;
  area?: string;
  tiempoMin?: number;
  escenariosCount?: number;
  preguntasCount?: number;
  estadoDisplay?: string;
  escenarioTitulo?: string;
  escenarioOrden?: number;
  escenariosTotal?: number;
  narrativa?: string;
  pregunta?: string;
  opciones?: CasePreviewOption[];
  progresoPct?: number;
}

@Component({
  selector: 'app-case-preview',
  imports: [CommonModule],
  templateUrl: './case-preview.html',
  styleUrl: './case-preview.scss',
})
export class CasePreview {
  readonly data = input.required<CasePreviewData>();
  readonly selectedOption = signal(0);

  readonly hasScene = computed(() => {
    const d = this.data();
    return !!(d.pregunta || d.narrativa || (d.opciones && d.opciones.length));
  });

  readonly progressPct = computed(() => this.data().progresoPct ?? 50);

  selectOption(index: number): void {
    this.selectedOption.set(index);
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
