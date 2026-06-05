import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  computed,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ContenidoIA, EscenarioIA, OpcionIA } from '../../../core/models/ia.model';

/**
 * Preview narrativo tipo simulador para una propuesta IA.
 *
 * Recibe el `contenido_json` y muestra:
 *  - Splash con storytelling.
 *  - Una "escena" por escenario, con ambientación dinámica, decisiones como
 *    botones, e impacto narrativo + retroalimentación al elegir.
 *  - Rúbrica en panel al final.
 *
 * Solo es vista (no envía nada al backend) — sirve para que el docente vea
 * cómo se sentirá la experiencia para el estudiante.
 */
@Component({
  selector: 'app-game-preview',
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatChipsModule, MatExpansionModule,
  ],
  templateUrl: './game-preview.html',
  styleUrl: './game-preview.scss',
  animations: [
    trigger('escena', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(28px) scale(0.985)' }),
        animate(
          '420ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-14px)' })),
      ]),
    ]),
    trigger('stagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(85, animate(
            '320ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            style({ opacity: 1, transform: 'translateY(0)' }),
          )),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class GamePreview {
  /** Contenido completo devuelto por la IA. */
  readonly contenido = input.required<ContenidoIA>();

  /** Modo demo del docente: se permite ver "respuesta correcta" al hacer click. */
  @Input() permitirRevelarCorrecta = true;

  readonly pasoIdx = signal(0);
  /** Por escenario, opción elegida (índice). */
  readonly elecciones = signal<Record<number, number>>({});

  readonly totalPasos = computed(() => {
    // intro + N escenarios + cierre
    return 1 + (this.contenido().escenarios?.length || 0) + 1;
  });

  readonly progreso = computed(() => {
    const t = this.totalPasos();
    if (!t) return 0;
    return Math.round((this.pasoIdx() / (t - 1)) * 100);
  });

  readonly esIntro = computed(() => this.pasoIdx() === 0);
  readonly esCierre = computed(() => this.pasoIdx() === this.totalPasos() - 1);

  readonly escenarioActual = computed<EscenarioIA | null>(() => {
    if (this.esIntro() || this.esCierre()) return null;
    return this.contenido().escenarios[this.pasoIdx() - 1] ?? null;
  });

  /** Clase de escena para variar paleta del fondo. */
  readonly escenaClase = computed(() => {
    const idx = this.pasoIdx();
    if (idx === 0) return 'scene-intro';
    if (this.esCierre()) return 'scene-final';
    return `scene-${((idx - 1) % 5) + 1}`;
  });

  siguiente() {
    if (this.pasoIdx() < this.totalPasos() - 1) {
      this.pasoIdx.update((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  anterior() {
    if (this.pasoIdx() > 0) {
      this.pasoIdx.update((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  reiniciar() {
    this.pasoIdx.set(0);
    this.elecciones.set({});
  }

  elegir(opcionIdx: number) {
    const k = this.pasoIdx();
    this.elecciones.update((m) => ({ ...m, [k]: opcionIdx }));
  }

  /** Devuelve la opción elegida en el escenario actual, si la hay. */
  opcionElegida(): OpcionIA | null {
    const k = this.pasoIdx();
    const idx = this.elecciones()[k];
    if (idx === undefined) return null;
    const esc = this.escenarioActual();
    if (!esc) return null;
    return esc.preguntas?.[0]?.opciones?.[idx] ?? null;
  }

  totalEscenarios(): number {
    return this.contenido().escenarios?.length || 0;
  }
}
