import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

import { ContenidoIA, EscenarioIA } from '../../../core/models/ia.model';
import { CasePreview, CasePreviewData } from '../../../shared/components/case-preview/case-preview';

@Component({
  selector: 'app-game-preview',
  imports: [CommonModule, CasePreview],
  templateUrl: './game-preview.html',
  styleUrl: './game-preview.scss',
})
export class GamePreview {
  readonly contenido = input.required<ContenidoIA>();

  readonly pasoIdx = signal(0);

  readonly escenarios = computed(() => this.contenido().escenarios ?? []);

  readonly totalPasos = computed(() => Math.max(this.escenarios().length, 1));

  readonly escenarioActual = computed((): EscenarioIA | null => {
    const list = this.escenarios();
    if (!list.length) return null;
    return list[Math.min(this.pasoIdx(), list.length - 1)] ?? null;
  });

  readonly previewData = computed((): CasePreviewData => {
    const c = this.contenido();
    const esc = this.escenarioActual();
    const preg = esc?.preguntas?.[0];
    const totalPreg = this.escenarios().reduce((n, e) => n + (e.preguntas?.length ?? 0), 0);

    return {
      titulo: c.titulo,
      area: c.area_psicologia_social,
      tiempoMin: c.tiempo_estimado,
      escenariosCount: this.escenarios().length,
      preguntasCount: totalPreg || undefined,
      estadoDisplay: 'Propuesta IA',
      escenarioTitulo: esc?.titulo,
      escenarioOrden: this.pasoIdx() + 1,
      escenariosTotal: this.escenarios().length,
      narrativa: esc?.narrativa || esc?.contexto || c.storytelling?.introduccion,
      pregunta: preg?.enunciado,
      opciones: preg?.opciones?.map((o) => ({ texto: o.texto })) ?? [],
      progresoPct: Math.round(((this.pasoIdx() + 1) / this.totalPasos()) * 100),
    };
  });

  anterior(): void {
    if (this.pasoIdx() > 0) this.pasoIdx.update((i) => i - 1);
  }

  siguiente(): void {
    if (this.pasoIdx() < this.totalPasos() - 1) this.pasoIdx.update((i) => i + 1);
  }

  reiniciar(): void {
    this.pasoIdx.set(0);
  }
}
