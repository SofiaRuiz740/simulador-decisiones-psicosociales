import { Component, Input, OnChanges, OnDestroy, SimpleChanges, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CasoDetalle, Pregunta, Respuesta } from '../../../core/models/casos.model';

type FasePreview = 'vacio' | 'advertencia' | 'contenido' | 'final';

interface ItemNarrativa {
  tipo: 'narrativa';
  escenarioId: number;
  titulo: string;
  texto: string;
}

interface ItemPregunta {
  tipo: 'pregunta';
  escenarioId: number;
  pregunta: Pregunta;
}

type ItemContenido = ItemNarrativa | ItemPregunta;

const TYPEWRITER_MS = 18;

/**
 * Vista previa de solo lectura de la experiencia "simulación de presentación"
 * (advertencia -> narrativa con efecto de máquina de escribir -> preguntas)
 * que ven los estudiantes en los casos que NO tienen simulación narrativa
 * visual (personajes/escenas). Pensada para que el docente revise el caso
 * tal como lo recibirá el estudiante, sin afectar ninguna participación.
 */
@Component({
  selector: 'app-simulacion-presentacion-preview',
  imports: [MatIconModule, MatProgressBarModule],
  templateUrl: './simulacion-presentacion-preview.html',
  styleUrl: './simulacion-presentacion-preview.scss',
})
export class SimulacionPresentacionPreviewComponent implements OnChanges, OnDestroy {
  @Input() caso: CasoDetalle | null = null;
  @Input() nombrePractica = '';

  readonly fase = signal<FasePreview>('vacio');

  readonly items = signal<ItemContenido[]>([]);
  readonly indiceActual = signal(0);
  readonly itemActual = computed<ItemContenido | null>(() => {
    const lista = this.items();
    const i = this.indiceActual();
    return i >= 0 && i < lista.length ? lista[i] : null;
  });

  readonly progreso = computed(() => {
    const total = this.items().length;
    if (!total) return 0;
    return Math.round(((this.indiceActual() + 1) / total) * 100);
  });

  readonly textoVisible = signal('');
  readonly typewriterCompleto = signal(false);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly respuestasSeleccionadas = signal<Record<number, number>>({});

  readonly respuestaSeleccionadaActual = computed(() => {
    const item = this.itemActual();
    if (!item || item.tipo !== 'pregunta') return null;
    return this.respuestasSeleccionadas()[item.pregunta.id] ?? null;
  });

  readonly puedeContinuar = computed(() => {
    const item = this.itemActual();
    if (!item) return false;
    if (item.tipo === 'narrativa') return this.typewriterCompleto();
    return this.respuestaSeleccionadaActual() != null;
  });

  readonly esUltimoItem = computed(() => this.indiceActual() >= this.items().length - 1);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['caso']) {
      this.construirItems();
    }
  }

  ngOnDestroy(): void {
    this.detenerTypewriter();
  }

  private construirItems(): void {
    this.detenerTypewriter();
    const caso = this.caso;
    if (!caso) {
      this.items.set([]);
      this.fase.set('vacio');
      return;
    }

    const escenarios = [...(caso.escenarios ?? [])].sort((a, b) => a.orden - b.orden);
    const items: ItemContenido[] = [];
    for (const escenario of escenarios) {
      if (escenario.narrativa?.trim()) {
        items.push({
          tipo: 'narrativa',
          escenarioId: escenario.id,
          titulo: escenario.titulo,
          texto: escenario.narrativa,
        });
      }
      const preguntas = [...(escenario.preguntas ?? [])].sort((a, b) => a.orden - b.orden);
      for (const pregunta of preguntas) {
        items.push({ tipo: 'pregunta', escenarioId: escenario.id, pregunta });
      }
    }

    this.items.set(items);
    this.indiceActual.set(0);
    this.respuestasSeleccionadas.set({});
    this.fase.set(items.length ? 'advertencia' : 'vacio');
  }

  aceptarAdvertencia(): void {
    this.fase.set('contenido');
    this.iniciarTypewriterItemActual();
  }

  private textoDelItem(item: ItemContenido): string {
    return item.tipo === 'narrativa' ? item.texto : item.pregunta.enunciado;
  }

  private iniciarTypewriterItemActual(): void {
    const item = this.itemActual();
    this.detenerTypewriter();
    this.textoVisible.set('');
    this.typewriterCompleto.set(false);

    if (!item) return;

    const texto = this.textoDelItem(item);
    this.escribir(texto, 0);
  }

  private escribir(texto: string, indice: number): void {
    if (indice >= texto.length) {
      this.typewriterCompleto.set(true);
      return;
    }
    this.textoVisible.set(texto.slice(0, indice + 1));
    this.timeoutId = setTimeout(() => this.escribir(texto, indice + 1), TYPEWRITER_MS);
  }

  private detenerTypewriter(): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  completarTypewriter(): void {
    const item = this.itemActual();
    if (!item) return;
    this.detenerTypewriter();
    this.textoVisible.set(this.textoDelItem(item));
    this.typewriterCompleto.set(true);
  }

  /** Selección de respuesta en modo solo lectura (no se envía a la API). */
  seleccionarRespuesta(pregunta: Pregunta, respuesta: Respuesta): void {
    if (!this.typewriterCompleto()) return;
    if (this.respuestaSeleccionadaActual() != null) return;

    this.respuestasSeleccionadas.update((actual) => ({
      ...actual,
      [pregunta.id]: respuesta.id,
    }));
  }

  esRespuestaSeleccionada(respuesta: Respuesta): boolean {
    return this.respuestaSeleccionadaActual() === respuesta.id;
  }

  siguiente(): void {
    if (!this.puedeContinuar()) return;

    if (this.esUltimoItem()) {
      this.fase.set('final');
      return;
    }

    this.indiceActual.update((i) => i + 1);
    this.iniciarTypewriterItemActual();
  }

  /** Reinicia la vista previa desde la pantalla de advertencia. */
  reiniciar(): void {
    this.indiceActual.set(0);
    this.respuestasSeleccionadas.set({});
    this.fase.set(this.items().length ? 'advertencia' : 'vacio');
  }
}
