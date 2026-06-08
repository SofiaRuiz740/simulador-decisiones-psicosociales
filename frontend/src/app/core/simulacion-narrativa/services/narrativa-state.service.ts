import { Injectable, computed, signal } from '@angular/core';

import {
  CasoNarrativoCompleto,
  ContradiccionInstancia,
  EscenarioResuelto,
  esContradiccionIdentificadaPorEstudiante,
  EstadoPartida,
  EventoSimulacionActivado,
  LibretaPsicologo,
  MetricasPersonaje,
  ObjetivoNarrativoEstado,
  TiempoNarrativo,
  TrazabilidadDocente,
  crearEstadoPartidaInicial,
} from '../models';
import { formatearTiempoNarrativo } from '../models/tiempo-narrativo.model';
import { resolverEscenarioPorId } from '../utils/escenario-dinamico.util';

@Injectable({ providedIn: 'root' })
export class NarrativaStateService {
  private readonly _caso = signal<CasoNarrativoCompleto | null>(null);
  private readonly _estado = signal<EstadoPartida | null>(null);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly caso = this._caso.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  readonly escenarioResuelto = computed<EscenarioResuelto | null>(() => {
    const caso = this._caso();
    const estado = this._estado();
    if (!caso || !estado) return null;
    return resolverEscenarioPorId(caso, estado, estado.escenarioActualId);
  });

  /** @deprecated Usar escenarioResuelto para reflejar variantes del mundo dinámico. */
  readonly escenarioActual = computed(() => {
    const resuelto = this.escenarioResuelto();
    return resuelto?.escenarioBase ?? null;
  });

  readonly tiempoNarrativo = computed<TiempoNarrativo | null>(() => {
    return this._estado()?.tiempoNarrativo ?? null;
  });

  readonly tiempoNarrativoFormateado = computed(() => {
    const tiempo = this.tiempoNarrativo();
    return tiempo ? formatearTiempoNarrativo(tiempo) : null;
  });

  readonly eventosActivados = computed<EventoSimulacionActivado[]>(() => {
    return this._estado()?.eventosActivados ?? [];
  });

  readonly objetivosCumplidos = computed<ObjetivoNarrativoEstado[]>(() => {
    return this._estado()?.objetivosCumplidos ?? [];
  });

  readonly evidenciasVisibles = computed(() => {
    const caso = this._caso();
    const estado = this._estado();
    if (!caso || !estado) return [];
    return estado.evidenciasDescubiertas
      .map((id) => caso.evidencias[id])
      .filter(Boolean);
  });

  readonly contradiccionesPosibles = computed<ContradiccionInstancia[]>(() => {
    const estado = this._estado();
    if (!estado) return [];
    return estado.instanciasContradiccion.filter((c) => c.estado === 'posible');
  });

  readonly contradiccionesDetectadas = computed<ContradiccionInstancia[]>(() => {
    const estado = this._estado();
    if (!estado) return [];
    return estado.instanciasContradiccion.filter(esContradiccionIdentificadaPorEstudiante);
  });

  /** Contradicciones identificadas por el estudiante (no incluye posibles internas). */
  readonly contradiccionesActivas = computed<ContradiccionInstancia[]>(() => {
    return this.contradiccionesDetectadas();
  });

  readonly libreta = computed<LibretaPsicologo | null>(() => {
    return this._estado()?.libreta ?? null;
  });

  readonly trazabilidad = computed<TrazabilidadDocente | null>(() => {
    return this._estado()?.trazabilidad ?? null;
  });

  inicializarSesion(caso: CasoNarrativoCompleto): void {
    this._caso.set(caso);
    this._estado.set(
      crearEstadoPartidaInicial(
        caso.manifest.id,
        caso.manifest.escenarioInicialId,
        caso.manifest.tiempoNarrativo?.inicio,
      ),
    );
    this._error.set(null);
  }

  actualizarEstado(mutador: (estado: EstadoPartida) => void): void {
    const actual = this._estado();
    if (!actual) return;
    const copia = structuredClone(actual);
    mutador(copia);
    this._estado.set(copia);
  }

  metricasDePersonaje(personajeId: string): MetricasPersonaje | undefined {
    return this._estado()?.metricasPersonajes[personajeId];
  }

  establecerCargando(valor: boolean): void {
    this._cargando.set(valor);
  }

  establecerError(mensaje: string | null): void {
    this._error.set(mensaje);
  }

  reiniciar(): void {
    this._caso.set(null);
    this._estado.set(null);
    this._cargando.set(false);
    this._error.set(null);
  }
}
