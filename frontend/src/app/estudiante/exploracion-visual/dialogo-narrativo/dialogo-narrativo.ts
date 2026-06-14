import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { NodoDialogo } from '../../../core/simulacion-narrativa/models/conversacion.model';
import { AssetService } from '../../../core/simulacion-narrativa/services/asset.service';
import { InterfazSonidoService } from '../../../core/simulacion-narrativa/services/interfaz-sonido.service';
import { NarrativaFacadeService } from '../../../core/simulacion-narrativa/services/narrativa-facade.service';
import { EscenaVisualService } from '../services/escena-visual.service';
import { resolverTextoNodo } from '../../../core/simulacion-narrativa/utils/memoria-narrativa.util';
import {
  PSICOLOGA_ENTREVISTADORA,
  nombrePersonajeVisible,
  rolPersonajeVisible,
} from '../utils/presentacion-personaje.util';

export const TYPEWRITER_MS = 28;

@Component({
  selector: 'app-dialogo-narrativo',
  imports: [MatIconModule, NgClass],
  templateUrl: './dialogo-narrativo.html',
  styleUrl: './dialogo-narrativo.scss',
})
export class DialogoNarrativoComponent {
  private readonly facade = inject(NarrativaFacadeService);
  private readonly assets = inject(AssetService);
  private readonly escenas = inject(EscenaVisualService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly interfazSonido = inject(InterfazSonidoService);

  readonly PSICOLOGA_ENTREVISTADORA = PSICOLOGA_ENTREVISTADORA;

  readonly conversacionId = input.required<string>();
  readonly modoAcercamiento = input(false);
  readonly velocidadTypewriter = input(TYPEWRITER_MS);

  readonly cerrar = output<void>();

  readonly saliendo = signal(false);
  readonly textoVisible = signal('');
  readonly typewriterCompleto = signal(true);
  readonly nodoPantalla = signal<NodoDialogo | null>(null);

  private typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  private ultimaSecuenciaTypewriter = '';
  private conversacionTypewriterId: string | null = null;

  readonly conversacionCompletada = computed(() => {
    const id = this.conversacionId();
    const estado = this.facade.estado();
    return !!id && !!estado?.conversacionesCompletadas.includes(id);
  });

  readonly nodo = computed<NodoDialogo | null>(() => {
    const id = this.conversacionId();
    if (!id) return null;
    if (this.enFatiga()) return this.facade.nodoConversacionActual(id);
    if (this.conversacionCompletada()) return null;
    return this.facade.nodoConversacionActual(id);
  });

  readonly bandaVisible = computed(() => !!this.nodoPantalla() || this.saliendo());

  readonly opciones = computed(() => {
    const id = this.conversacionId();
    return id ? this.facade.opcionesDisponibles(id) : [];
  });

  readonly personajeEntrevistadoId = computed(() => {
    const convId = this.conversacionId();
    const caso = this.facade.caso();
    if (!convId || !caso) return null;
    return caso.conversaciones[convId]?.personajeId ?? null;
  });

  readonly retratoPsicologaUrl = computed(() =>
    this.assets.resolverRetratoConversacion({
      rolVisual: PSICOLOGA_ENTREVISTADORA.rolVisual,
    }),
  );

  readonly nombreEntrevistado = computed(() => {
    const nodo = this.nodoPantalla();
    const caso = this.facade.caso();
    if (!nodo) return '';

    if (nodo.emisor === 'narrador') {
      const id = this.personajeEntrevistadoId();
      return id ? nombrePersonajeVisible(id, caso?.personajes) : 'ENTREVISTA';
    }

    if (nodo.emisor === 'jugador') {
      return nombrePersonajeVisible(this.personajeEntrevistadoId(), caso?.personajes);
    }

    const id = nodo.personajeId ?? this.personajeEntrevistadoId();
    return nombrePersonajeVisible(id, caso?.personajes);
  });

  readonly rolEntrevistado = computed(() => {
    const nodo = this.nodoPantalla();
    if (!nodo) return '';

    if (nodo.emisor === 'narrador') {
      const id = this.personajeEntrevistadoId();
      return rolPersonajeVisible(
        id,
        this.escenas.rolVisualParaConversacion(id ?? '', this.conversacionId()),
        this.facade.caso()?.personajes,
      );
    }

    const personajeId = nodo.personajeId ?? this.personajeEntrevistadoId();
    return rolPersonajeVisible(
      personajeId,
      this.escenas.rolVisualParaConversacion(personajeId ?? '', this.conversacionId()),
      this.facade.caso()?.personajes,
    );
  });

  readonly retratoEntrevistadoUrl = computed(() => {
    const personajeId = this.personajeEntrevistadoId();
    const conversacionId = this.conversacionId();
    if (!personajeId) return null;

    const rolVisual = this.escenas.rolVisualParaConversacion(personajeId, conversacionId);
    return (
      this.assets.resolverRetratoConversacion({
        rolVisual,
        personajeId,
        conversacionId,
      }) || null
    );
  });

  readonly esNodoFinal = computed(() => {
    const nodo = this.nodo();
    if (!nodo) return true;
    return !nodo.siguienteNodoId && !nodo.opciones?.length;
  });

  readonly enFatiga = computed(() =>
    this.facade.estaConversacionEnModoFatiga(this.conversacionId()),
  );

  readonly textoCompleto = computed(() => {
    const nodo = this.nodoPantalla();
    if (!nodo) return '';
    if (nodo.emisor === 'jugador' && this.opciones().length) {
      return this.textoJugadorDesde(nodo);
    }
    return nodo.texto;
  });

  readonly rolVisualEntrevistado = computed(() => {
    const personajeId = this.personajeEntrevistadoId();
    return this.escenas.rolVisualParaConversacion(personajeId ?? '', this.conversacionId());
  });

  readonly esReflexionClinica = computed(() => {
    const opts = this.opciones();
    if (!opts.length) return false;
    const first = opts[0]?.texto?.trim() ?? '';
    return !first.startsWith('«');
  });

  readonly emisorActual = computed(() => this.nodoPantalla()?.emisor ?? 'narrador');

  readonly nombreOrador = computed(() => {
    const emisor = this.emisorActual();
    if (emisor === 'jugador') return PSICOLOGA_ENTREVISTADORA.nombre;
    return this.nombreEntrevistado();
  });

  readonly rolOrador = computed(() => {
    const emisor = this.emisorActual();
    if (emisor === 'jugador') return PSICOLOGA_ENTREVISTADORA.rol;
    return this.rolEntrevistado();
  });

  readonly personajeActivo = computed((): 'npc' | 'psicologa' => {
    const emisor = this.emisorActual();
    if (emisor === 'jugador') return 'psicologa';
    return 'npc';
  });

  constructor() {
    effect(() => {
      const convId = this.conversacionId();
      if (convId !== this.conversacionTypewriterId) {
        this.conversacionTypewriterId = convId;
        this.ultimaSecuenciaTypewriter = '';
      }
    });

    effect(() => {
      const nodo = this.nodo();
      const convId = this.conversacionId();
      const estado = this.facade.estado();
      const caso = this.facade.caso();

      if (nodo) {
        this.nodoPantalla.set(nodo);
        return;
      }

      if (!convId || !estado || !caso) return;
      if (!estado.conversacionesCompletadas.includes(convId)) return;

      const visitados = estado.nodosVisitadosPorConversacion[convId] ?? [];
      const ultimoId = visitados.at(-1);
      if (!ultimoId || this.nodoPantalla()?.id === ultimoId) return;

      const conversacion = caso.conversaciones[convId];
      const raw = conversacion?.nodos.find((item) => item.id === ultimoId);
      if (!raw) return;

      const personaje = conversacion.personajeId
        ? caso.personajes[conversacion.personajeId]
        : undefined;
      this.nodoPantalla.set({
        ...raw,
        texto: resolverTextoNodo(raw, estado, caso, personaje),
      });
    });

    effect(() => {
      const pantallaId = this.nodoPantalla()?.id ?? '';
      const texto = this.textoCompleto();
      const clave = `${pantallaId}\u0000${texto}`;

      if (!texto && !pantallaId) {
        this.textoVisible.set('');
        this.typewriterCompleto.set(true);
        return;
      }

      if (clave === this.ultimaSecuenciaTypewriter) return;
      this.ultimaSecuenciaTypewriter = clave;
      this.iniciarTypewriter(texto);
    });

    this.destroyRef.onDestroy(() => this.limpiarTypewriter());
  }

  onTextoClick(event: MouseEvent): void {
    event.stopPropagation();
    this.completarTypewriter();
  }

  seleccionarOpcion(opcionId: string): void {
    if (!this.typewriterCompleto()) {
      this.completarTypewriter();
      return;
    }
    this.interfazSonido.avanzarDialogo();
    this.facade.seleccionarOpcionDialogo(this.conversacionId(), opcionId);
  }

  continuar(): void {
    if (!this.typewriterCompleto()) {
      this.completarTypewriter();
      return;
    }

    const id = this.conversacionId();
    if (this.esNodoFinal()) {
      this.facade.finalizarConversacionActiva(id);
      this.interfazSonido.completarEntrevista();
      this.cerrarAnimado();
      return;
    }
    this.interfazSonido.avanzarDialogo();
    this.facade.avanzarConversacionAutomatica(id);
  }

  cerrarDialogo(): void {
    this.interfazSonido.cerrarConversacion();
    this.cerrarAnimado();
  }

  private iniciarTypewriter(texto: string): void {
    this.limpiarTypewriter();

    if (!texto) {
      this.textoVisible.set('');
      this.typewriterCompleto.set(true);
      return;
    }

    this.typewriterCompleto.set(false);
    this.textoVisible.set('');

    let indice = 0;
    const avanzar = (): void => {
      indice += 1;
      this.textoVisible.set(texto.slice(0, indice));

      if (indice >= texto.length) {
        this.typewriterCompleto.set(true);
        this.typewriterTimer = null;
        return;
      }

      this.typewriterTimer = setTimeout(avanzar, this.velocidadTypewriter());
    };

    this.typewriterTimer = setTimeout(avanzar, this.velocidadTypewriter());
  }

  private completarTypewriter(): void {
    if (this.typewriterCompleto()) return;
    this.limpiarTypewriter();
    this.textoVisible.set(this.textoCompleto());
    this.typewriterCompleto.set(true);
  }

  private limpiarTypewriter(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private cerrarAnimado(): void {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    window.setTimeout(() => this.cerrar.emit(), 300);
  }

  private textoJugadorDesde(nodo: NodoDialogo): string {
    return nodo.texto.replace(/\?$/, '…').replace(/^¿/, '');
  }
}
