import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Pregunta, Respuesta } from '../../core/models/casos.model';
import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { SimulacionService } from '../../core/services/simulacion.service';
import { SalirPracticaDialogComponent } from '../components/salir-practica-dialog/salir-practica-dialog';
import { MatDialog } from '@angular/material/dialog';

type Fase = 'cargando' | 'error' | 'advertencia' | 'contenido' | 'final';

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

const TYPEWRITER_MS = 22;

/** Personajes disponibles — se rotan cíclicamente por ítem (8 imágenes). */
const PERSONAJES = [
  'assets/estudiantes/chica1.png',
  'assets/estudiantes/chico1.png',
  'assets/estudiantes/chica2.png',
  'assets/estudiantes/chico2.png',
  'assets/estudiantes/chica3.png',
  'assets/estudiantes/chico3.png',
  'assets/estudiantes/chica4.png',
  'assets/estudiantes/chico4.png',
] as const;

@Component({
  selector: 'app-simulacion-presentacion',
  imports: [RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './simulacion-presentacion.html',
  styleUrl: './simulacion-presentacion.scss',
})
export class SimulacionPresentacion implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(EstudianteSessionService);
  private readonly simulacionApi = inject(SimulacionService);
  private readonly dialog = inject(MatDialog);

  readonly fase = signal<Fase>('cargando');
  readonly errorMensaje = signal('');
  readonly nombrePractica = signal('Práctica');
  readonly nombreCaso = signal('Caso clínico');

  private practicaId: number | null = null;
  private participacionId: number | null = null;

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

  // --- Typewriter ---
  readonly textoVisible = signal('');
  readonly typewriterCompleto = signal(false);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  // --- Respuestas seleccionadas: preguntaId -> respuestaId ---
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

  /**
   * Devuelve un array de un solo elemento con {idx, src} del personaje actual.
   * Usar con @for + track idx para que Angular recree el elemento en cada paso
   * y la animación CSS se reproduzca desde el inicio.
   */
  readonly personajeFrame = computed(() => [{
    idx: this.indiceActual(),
    src: PERSONAJES[this.indiceActual() % PERSONAJES.length],
  }]);

  ngOnInit(): void {
    const practicaParam = this.route.snapshot.paramMap.get('practicaId');
    const practicaId = practicaParam ? Number(practicaParam) : null;
    const registro = practicaId ? this.session.obtenerPractica(practicaId) : undefined;

    if (!practicaId || !registro?.autorizacion_id) {
      this.router.navigate(['/panel-estudiante']);
      return;
    }

    this.practicaId = practicaId;
    this.nombrePractica.set(registro.nombre ?? 'Práctica');
    this.nombreCaso.set(registro.caso_nombre ?? 'Caso clínico');
    this.session.seleccionarPractica(practicaId);

    this.simulacionApi.iniciarParticipacion(registro.autorizacion_id).subscribe({
      next: (participacion) => {
        this.participacionId = participacion.id;

        const caso = participacion.caso;
        const escenarios = [...(caso?.escenarios ?? [])].sort((a, b) => a.orden - b.orden);

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

        const seleccionadas: Record<number, number> = {};
        for (const r of participacion.respuestas_seleccionadas ?? []) {
          seleccionadas[r.pregunta] = r.respuesta_elegida;
        }
        this.respuestasSeleccionadas.set(seleccionadas);

        if (caso?.nombre) this.nombreCaso.set(caso.nombre);

        if (!items.length) {
          this.errorMensaje.set('Este caso todavía no tiene contenido configurado.');
          this.fase.set('error');
          return;
        }

        this.items.set(items);
        this.fase.set('advertencia');
      },
      error: () => {
        this.errorMensaje.set('No se pudo iniciar la práctica. Intenta de nuevo más tarde.');
        this.fase.set('error');
      },
    });
  }

  ngOnDestroy(): void {
    this.detenerTypewriter();
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

    // Si la pregunta ya fue respondida antes, mostramos el texto completo de una vez.
    const yaRespondida = item.tipo === 'pregunta' && this.respuestaSeleccionadaActual() != null;
    const texto = this.textoDelItem(item);

    if (yaRespondida) {
      this.textoVisible.set(texto);
      this.typewriterCompleto.set(true);
      return;
    }

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

  seleccionarRespuesta(pregunta: Pregunta, respuesta: Respuesta): void {
    if (!this.typewriterCompleto() || !this.participacionId) return;
    if (this.respuestaSeleccionadaActual() != null) return;

    this.respuestasSeleccionadas.update((actual) => ({
      ...actual,
      [pregunta.id]: respuesta.id,
    }));

    this.simulacionApi.responder(this.participacionId, pregunta.id, respuesta.id).subscribe({
      error: (err) => console.error('No se pudo registrar la respuesta:', err),
    });
  }

  esRespuestaSeleccionada(respuesta: Respuesta): boolean {
    return this.respuestaSeleccionadaActual() === respuesta.id;
  }

  siguiente(): void {
    if (!this.puedeContinuar()) return;

    if (this.esUltimoItem()) {
      this.finalizarPractica();
      return;
    }

    this.indiceActual.update((i) => i + 1);
    this.iniciarTypewriterItemActual();
  }

  private finalizarPractica(): void {
    if (!this.participacionId || !this.practicaId) return;

    const totalPreguntas = this.items().filter((i) => i.tipo === 'pregunta').length;

    this.simulacionApi.finalizar(this.participacionId).subscribe({
      next: () => {
        this.session.guardarProgreso(this.practicaId!, {
          conversacionesCompletadas: totalPreguntas,
          conversacionesTotales: totalPreguntas,
          resultadoId: this.practicaId!,
        });
        this.fase.set('final');
      },
      error: (err) => {
        console.error('No se pudo finalizar la práctica:', err);
        this.fase.set('final');
      },
    });
  }

  confirmarSalida(): void {
    const ref = this.dialog.open(SalirPracticaDialogComponent, {
      width: '440px',
      disableClose: true,
    });

    ref.afterClosed().subscribe((salir) => {
      if (!salir) return;
      this.router.navigate(['/panel-estudiante']);
    });
  }
}
