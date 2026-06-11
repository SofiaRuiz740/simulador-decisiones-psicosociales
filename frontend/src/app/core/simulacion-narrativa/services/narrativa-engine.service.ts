import { Injectable, inject } from '@angular/core';

import {
  CasoNarrativoCompleto,
  Conversacion,
  Escenario,
  EscenarioResuelto,
  EstadoContradiccionInstancia,
  EstadoPartida,
  EstrategiaClinica,
  Evidencia,
  EventoSimulacionActivado,
  Hipotesis,
  IntervencionPsicologica,
  MetricasPersonaje,
  NodoDialogo,
  ObjetivoNarrativoEstado,
  OpcionDialogo,
  ResumenPedagogico,
  SoporteHipotesis,
  TransicionEscenario,
} from '../models';
import {
  buscarInstanciaPosible,
  detectarContradiccionesDinamicas,
  evaluarContradiccionesPredefinidasPosibles,
  integrarContradiccionesPosibles,
  promoverContradiccionADetectada,
  registrarAfirmacionActiva,
} from '../utils/contradiccion-detector.util';
import { conversacionPerteneceEscenarioActual } from '../utils/conversacion-escenario.util';
import { evaluarCondiciones } from '../utils/condicion-evaluator';
import { resolverEscenarioDinamico, resolverEscenarioPorId } from '../utils/escenario-dinamico.util';
import {
  aplicarEfectos,
  aplicarEstrategiaClinica,
  ContextoAplicacionEfectos,
} from '../utils/efecto-aplicador';
import {
  conversacionesUtilesRestantes,
  crearNodoFatiga,
  cuentaComoConversacionUtil,
  incrementarConversacionUtil,
  personajeAgotado,
} from '../utils/fatiga-personaje.util';
import { inicializarMetricasPersonajes } from '../utils/metricas-personaje.util';
import {
  actualizarMemoriaTrasConversacionCompleta,
  inicializarMemoriaPersonajes,
  registrarConfrontacionEnMemoria,
  resolverNodoInicialConMemoria,
  resolverTextoNodo,
} from '../utils/memoria-narrativa.util';
import { evaluarObjetivosNarrativos } from '../utils/objetivo-narrativo.util';
import { evaluarEventosPendientes } from '../utils/progresion-narrativa.util';
import {
  conversacionPermiteRevisita,
  evaluarDesbloqueosRevisita,
} from '../utils/revisita.util';
import { avanzarTiempoNarrativo } from '../models/tiempo-narrativo.model';
import { validarSoportesHipotesis } from '../utils/hipotesis-soporte.util';
import { sincronizarLibretaDesdeEstado } from '../utils/libreta-sync.util';
import { NarrativaStateService } from './narrativa-state.service';
import {
  actualizarEstadoContradiccion,
  TrazabilidadService,
} from './trazabilidad.service';
import { NarrativaPersistenciaService } from './narrativa-persistencia.service';
import { PartidaPersistida } from '../utils/partida-persistencia.util';

@Injectable({ providedIn: 'root' })
export class NarrativaEngineService {
  private readonly state = inject(NarrativaStateService);
  private readonly trazabilidad = inject(TrazabilidadService);
  private readonly persistencia = inject(NarrativaPersistenciaService);

  private get caso(): CasoNarrativoCompleto | null {
    return this.state.caso();
  }

  private contextoBase(
    conversacionId?: string,
    personajeId?: string,
  ): ContextoAplicacionEfectos {
    return {
      caso: this.caso,
      trazabilidad: this.trazabilidad,
      conversacionId,
      personajeId,
      escenarioId: this.state.estado()?.escenarioActualId,
    };
  }

  escenariosDisponibles(): Escenario[] {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return [];

    return Object.values(caso.escenarios)
      .filter((escenario) => evaluarCondiciones(escenario.requisitosAcceso, estado, caso))
      .map((escenario) => resolverEscenarioDinamico(escenario, estado, caso).escenarioBase);
  }

  obtenerEscenarioResuelto(escenarioId?: string): EscenarioResuelto | null {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return null;
    const id = escenarioId ?? estado.escenarioActualId;
    return resolverEscenarioPorId(caso, estado, id);
  }

  conversacionesDisponibles(): Conversacion[] {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return [];

    return Object.values(caso.conversaciones).filter((conversacion) => {
      if (!conversacionPerteneceEscenarioActual(conversacion, estado, caso)) return false;
      if (!evaluarCondiciones(conversacion.requisitosAcceso, estado, caso)) return false;
      if (conversacionPermiteRevisita(conversacion, estado, caso)) return true;
      if (this.estaConversacionBloqueadaPorFatiga(conversacion.id)) return false;
      return true;
    });
  }

  contradiccionesPosibles() {
    const estado = this.state.estado();
    if (!estado) return [];
    return estado.instanciasContradiccion.filter((c) => c.estado === 'posible');
  }

  contradiccionesDetectadas() {
    const estado = this.state.estado();
    if (!estado) return [];
    return estado.instanciasContradiccion.filter(
      (c) => c.estado === 'detectada' || c.estado === 'analizada' || c.estado === 'resuelta',
    );
  }

  evidenciasDescubribles(): Evidencia[] {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return [];

    return Object.values(caso.evidencias).filter(
      (evidencia) =>
        !estado.evidenciasDescubiertas.includes(evidencia.id) &&
        evaluarCondiciones(evidencia.requisitosDescubrimiento, estado, caso),
    );
  }

  hipotesisFormulables(): Hipotesis[] {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return [];

    return Object.values(caso.hipotesis).filter(
      (hipotesis) =>
        !estado.hipotesisFormuladas.includes(hipotesis.id) &&
        evaluarCondiciones(hipotesis.requisitosFormulacion, estado, caso),
    );
  }

  intervencionesDisponibles(): IntervencionPsicologica[] {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return [];

    return Object.values(caso.intervenciones).filter((intervencion) =>
      evaluarCondiciones(intervencion.requisitosActivacion, estado, caso),
    );
  }

  transicionesDisponibles(): TransicionEscenario[] {
    const escenario = this.state.escenarioActual();
    const estado = this.state.estado();
    const caso = this.caso;
    if (!escenario || !estado) return [];

    return (escenario.transiciones ?? []).filter((t) =>
      evaluarCondiciones(t.requisitos, estado, caso),
    );
  }

  obtenerMetricasPersonaje(personajeId: string): MetricasPersonaje | undefined {
    return this.state.estado()?.metricasPersonajes[personajeId];
  }

  conversacionesRestantesPersonaje(personajeId: string): number {
    const caso = this.caso;
    const estado = this.state.estado();
    const personaje = caso?.personajes[personajeId];
    if (!estado || !personaje) return 0;
    return conversacionesUtilesRestantes(estado, personaje);
  }

  estaConversacionBloqueadaPorFatiga(conversacionId: string): boolean {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return false;

    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion?.personajeId || !cuentaComoConversacionUtil(conversacion)) return false;
    if (conversacionPermiteRevisita(conversacion, estado, caso)) return false;

    const personaje = caso.personajes[conversacion.personajeId];
    return personajeAgotado(estado, personaje);
  }

  estaConversacionEnModoFatiga(conversacionId: string): boolean {
    return this.state.estado()?.conversacionesEnFatiga.includes(conversacionId) ?? false;
  }

  /** Reabre una conversación ya completada o agotada solo para mostrar respuesta contextual. */
  activarModoAgotamientoConversacion(conversacionId: string): void {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return;

    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion?.personajeId) return;

    const completada = estado.conversacionesCompletadas.includes(conversacionId);
    const agotada = this.estaConversacionBloqueadaPorFatiga(conversacionId);
    if (!completada && !agotada) return;

    this.state.actualizarEstado((estadoMut) => {
      if (!estadoMut.conversacionesEnFatiga.includes(conversacionId)) {
        estadoMut.conversacionesEnFatiga.push(conversacionId);
      }
    });
  }

  conversacionPermiteReintentoAgotamiento(conversacionId: string): boolean {
    const estado = this.state.estado();
    if (!estado) return false;
    if (estado.conversacionesCompletadas.includes(conversacionId)) return true;
    return this.estaConversacionBloqueadaPorFatiga(conversacionId);
  }

  nodoConversacionActual(conversacionId: string): NodoDialogo | null {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return null;

    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion) return null;

    if (this.estaConversacionEnModoFatiga(conversacionId)) {
      const personaje = conversacion.personajeId
        ? caso.personajes[conversacion.personajeId]
        : undefined;
      if (personaje) return crearNodoFatiga(conversacion, personaje);
    }

    const nodoId =
      estado.nodosConversacionActivos[conversacionId] ?? conversacion.nodoInicialId;
    const nodo = conversacion.nodos.find((n) => n.id === nodoId) ?? null;
    return nodo ? this.resolverNodoVisible(conversacion, nodo, estado) : null;
  }

  private resolverNodoVisible(
    conversacion: Conversacion,
    nodo: NodoDialogo,
    estado: EstadoPartida,
  ): NodoDialogo {
    const caso = this.caso;
    const personaje = conversacion.personajeId
      ? caso?.personajes[conversacion.personajeId]
      : undefined;
    return {
      ...nodo,
      texto: resolverTextoNodo(nodo, estado, caso, personaje),
    };
  }

  opcionesDisponibles(conversacionId: string): OpcionDialogo[] {
    if (this.estaConversacionEnModoFatiga(conversacionId)) return [];

    const nodo = this.nodoConversacionActual(conversacionId);
    const estado = this.state.estado();
    const caso = this.caso;
    if (!nodo?.opciones || !estado) return [];

    return nodo.opciones.filter((opcion) =>
      evaluarCondiciones(opcion.requisitos, estado, caso),
    );
  }

  iniciarConversacion(conversacionId: string): boolean {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return false;

    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion) return false;

    if (!conversacionPerteneceEscenarioActual(conversacion, estado, caso)) return false;
    if (!evaluarCondiciones(conversacion.requisitosAcceso, estado, caso)) return false;

    if (this.estaConversacionBloqueadaPorFatiga(conversacionId)) {
      this.state.actualizarEstado((estadoMut) => {
        if (!estadoMut.conversacionesEnFatiga.includes(conversacionId)) {
          estadoMut.conversacionesEnFatiga.push(conversacionId);
        }
      });
      return false;
    }

    this.state.actualizarEstado((estadoMut) => {
      const personaje = conversacion.personajeId
        ? caso.personajes[conversacion.personajeId]
        : undefined;
      const nodoInicial = personaje
        ? resolverNodoInicialConMemoria(conversacion, estadoMut, personaje)
        : conversacion.nodoInicialId;

      estadoMut.nodosConversacionActivos[conversacionId] = nodoInicial;
      this.procesarNodo(conversacionId, nodoInicial, estadoMut);

      this.trazabilidad.registrarConversacionIniciada(estadoMut, conversacionId, {
        personajeId: conversacion.personajeId,
        titulo: conversacion.titulo,
        cuentaComoUtil: cuentaComoConversacionUtil(conversacion),
      });
    });

    return true;
  }

  seleccionarOpcionDialogo(conversacionId: string, opcionId: string): void {
    const caso = this.caso;
    if (!caso || this.estaConversacionEnModoFatiga(conversacionId)) return;

    const conversacion = caso.conversaciones[conversacionId];
    const nodo = this.nodoConversacionActual(conversacionId);
    const opcion = nodo?.opciones?.find((o) => o.id === opcionId);
    if (!conversacion || !opcion) return;

    this.state.actualizarEstado((estado) => {
      const ctx = this.contextoBase(conversacionId, conversacion.personajeId);

      aplicarEstrategiaClinica(
        estado,
        caso,
        opcion.estrategiaClinica,
        conversacion.personajeId,
        {
          origen: 'dialogo',
          conversacionId,
          opcionId: opcion.id,
          modificadoresMetricasExtra: opcion.modificadoresMetricas,
        },
        this.trazabilidad,
      );

      if (conversacion.personajeId && opcion.estrategiaClinica === 'confrontacion') {
        registrarConfrontacionEnMemoria(estado, conversacion.personajeId);
      }

      aplicarEfectos(estado, opcion.efectos, ctx);
      this.trazabilidad.registrarOpcionSeleccionada(estado, conversacionId, opcion.id);

      const parametrosDecision: Record<string, string | number | boolean | string[]> = {
        tipo: 'opcion_dialogo',
        entidadId: conversacionId,
        opcionId: opcion.id,
      };
      if (opcion.enfoque) parametrosDecision['contexto'] = opcion.enfoque;

      aplicarEfectos(
        estado,
        [{ tipo: 'registrar_decision', parametros: parametrosDecision }],
        ctx,
      );

      if (opcion.siguienteNodoId) {
        estado.nodosConversacionActivos[conversacionId] = opcion.siguienteNodoId;
        this.procesarNodo(conversacionId, opcion.siguienteNodoId, estado);
      } else {
        this.completarConversacion(conversacionId, conversacion, estado);
      }

      this.postProcesarEstado(estado);
    });
  }

  /** Asegura el cierre de la entrevista cuando el nodo final no aplicó efectos al mostrar. */
  finalizarConversacionActiva(conversacionId: string): void {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado || this.estaConversacionEnModoFatiga(conversacionId)) return;
    if (estado.conversacionesCompletadas.includes(conversacionId)) return;

    const conversacion = caso.conversaciones[conversacionId];
    if (!conversacion) return;

    this.state.actualizarEstado((estadoMut) => {
      this.completarConversacion(conversacionId, conversacion, estadoMut);
      this.postProcesarEstado(estadoMut);
    });
  }

  avanzarConversacionAutomatica(conversacionId: string): void {
    const caso = this.caso;
    if (!caso || this.estaConversacionEnModoFatiga(conversacionId)) return;

    const conversacion = caso.conversaciones[conversacionId];
    const nodo = this.nodoConversacionActual(conversacionId);
    if (!conversacion || !nodo?.siguienteNodoId || nodo.opciones?.length) return;

    this.state.actualizarEstado((estado) => {
      estado.nodosConversacionActivos[conversacionId] = nodo.siguienteNodoId!;
      this.procesarNodo(conversacionId, nodo.siguienteNodoId!, estado);
      this.postProcesarEstado(estado);
    });
  }

  descubrirEvidencia(evidenciaId: string): void {
    const caso = this.caso;
    this.state.actualizarEstado((estado) => {
      const ctx = this.contextoBase(undefined, undefined);
      aplicarEfectos(
        estado,
        [
          { tipo: 'descubrir_evidencia', parametros: { evidenciaId } },
          {
            tipo: 'registrar_decision',
            parametros: { tipo: 'descubrir_evidencia', entidadId: evidenciaId },
          },
          { tipo: 'modificar_competencia', parametros: { competencia: 'capacidad_investigativa', delta: 5 } },
        ],
        ctx,
      );
      this.postProcesarEstado(estado);
    });
  }

  formularHipotesis(hipotesisId: string, soportes: SoporteHipotesis[]): string | null {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return 'No hay sesión activa.';

    const hipotesis = caso.hipotesis[hipotesisId];
    if (!hipotesis) return 'Hipótesis no encontrada.';
    if (estado.hipotesisFormuladas.includes(hipotesisId)) {
      return 'Esta hipótesis ya fue formulada.';
    }
    if (!evaluarCondiciones(hipotesis.requisitosFormulacion, estado, caso)) {
      return 'Aún no cumples los requisitos para formular esta hipótesis.';
    }

    const errorSoportes = validarSoportesHipotesis(soportes, estado);
    if (errorSoportes) return errorSoportes;

    this.state.actualizarEstado((estadoMut) => {
      aplicarEfectos(
        estadoMut,
        [
          { tipo: 'formular_hipotesis', parametros: { hipotesisId } },
          {
            tipo: 'registrar_decision',
            parametros: { tipo: 'formular_hipotesis', entidadId: hipotesisId },
          },
          { tipo: 'modificar_competencia', parametros: { competencia: 'pensamiento_critico', delta: 6 } },
        ],
        { ...this.contextoBase(), soportesHipotesis: soportes },
      );
      this.postProcesarEstado(estadoMut);
    });

    return null;
  }

  /**
   * Acción explícita del estudiante: promueve una contradicción posible a detectada.
   * @returns mensaje de error o null si tuvo éxito
   */
  analizarContradiccion(referenciaId: string): string | null {
    const caso = this.caso;
    if (!this.state.estado() || !caso) return 'No hay sesión activa.';

    this.state.actualizarEstado((estadoMut) => {
      let posible = buscarInstanciaPosible(estadoMut, referenciaId);
      if (!posible) {
        const nuevas = evaluarContradiccionesPredefinidasPosibles(estadoMut, caso);
        integrarContradiccionesPosibles(estadoMut, nuevas);
        posible = buscarInstanciaPosible(estadoMut, referenciaId);
      }
      if (!posible) return;

      const instancia = promoverContradiccionADetectada(estadoMut, posible.id);
      if (!instancia) return;

      this.trazabilidad.registrarContradiccionInstancia(estadoMut, instancia);

      aplicarEfectos(
        estadoMut,
        [
          {
            tipo: 'registrar_decision',
            parametros: {
              tipo: 'analizar_contradiccion',
              entidadId: instancia.id,
            },
          },
          { tipo: 'modificar_competencia', parametros: { competencia: 'pensamiento_critico', delta: 8 } },
        ],
        this.contextoBase(),
      );

      this.postProcesarEstado(estadoMut, false);
    });

    const estado = this.state.estado();
    if (!estado) return 'No hay sesión activa.';
    const identificada = estado.instanciasContradiccion.some(
      (c) =>
        (c.id === referenciaId || c.plantillaId === referenciaId) &&
        (c.estado === 'detectada' || c.estado === 'analizada' || c.estado === 'resuelta'),
    );
    return identificada ? null : 'No hay una contradicción posible pendiente de análisis con esa referencia.';
  }

  /** @deprecated Usar analizarContradiccion para contradicciones posibles. */
  identificarContradiccion(contradiccionId: string): string | null {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado) return 'No hay sesión activa.';

    const posible = buscarInstanciaPosible(estado, contradiccionId);
    if (posible) {
      return this.analizarContradiccion(contradiccionId);
    }

    const plantilla = caso.contradicciones[contradiccionId];
    if (plantilla) {
      if (!evaluarCondiciones(plantilla.requisitosRevelacion, estado, caso)) {
        return 'Aún no cumples los requisitos para analizar esta contradicción.';
      }
      return this.analizarContradiccion(contradiccionId);
    }

    return 'Contradicción no encontrada.';
  }

  actualizarEstadoContradiccion(
    instanciaId: string,
    nuevoEstado: EstadoContradiccionInstancia,
  ): boolean {
    let actualizado = false;

    this.state.actualizarEstado((estado) => {
      actualizado = actualizarEstadoContradiccion(estado, instanciaId, nuevoEstado);
      if (actualizado) {
        const instancia = estado.instanciasContradiccion.find((c) => c.id === instanciaId);
        if (instancia) this.trazabilidad.registrarContradiccionInstancia(estado, instancia);
      }
    });

    return actualizado;
  }

  aplicarIntervencion(intervencionId: string): void {
    const caso = this.caso;
    if (!caso) return;

    const intervencion = caso.intervenciones[intervencionId];
    if (!intervencion) return;

    this.state.actualizarEstado((estado) => {
      const personajeId = intervencion.personajesObjetivo?.[0];
      const estrategia = this.mapearTipoIntervencionAEstrategia(intervencion.tipo);

      aplicarEstrategiaClinica(
        estado,
        caso,
        estrategia,
        personajeId,
        { origen: 'intervencion_estructurada', intervencionId },
        this.trazabilidad,
      );

      const ctx = this.contextoBase(undefined, personajeId);
      aplicarEfectos(
        estado,
        [
          { tipo: 'aplicar_intervencion', parametros: { intervencionId } },
          {
            tipo: 'registrar_decision',
            parametros: { tipo: 'aplicar_intervencion', entidadId: intervencionId },
          },
        ],
        ctx,
      );
      aplicarEfectos(estado, intervencion.efectosNarrativos, ctx);
      this.postProcesarEstado(estado);
    });
  }

  transicionarEscenario(transicionId: string): void {
    const escenario = this.state.escenarioActual();
    const caso = this.caso;
    const estado = this.state.estado();
    if (!escenario || !caso || !estado) return;

    const transicion = escenario.transiciones?.find((t) => t.id === transicionId);
    if (!transicion || !evaluarCondiciones(transicion.requisitos, estado, caso)) return;

    this.state.actualizarEstado((estadoMut) => {
      aplicarEfectos(estadoMut, transicion.efectos, this.contextoBase());
      estadoMut.escenarioActualId = transicion.escenarioDestinoId;
      if (!estadoMut.escenariosVisitados.includes(transicion.escenarioDestinoId)) {
        estadoMut.escenariosVisitados.push(transicion.escenarioDestinoId);
      }
      aplicarEfectos(
        estadoMut,
        [
          {
            tipo: 'registrar_decision',
            parametros: {
              tipo: 'transicion_escenario',
              entidadId: transicion.escenarioDestinoId,
              opcionId: transicionId,
            },
          },
        ],
        this.contextoBase(),
      );
    });
  }

  /** Sincroniza el escenario narrativo al explorar una zona visual (p. ej. comisaría). */
  establecerEscenarioNarrativo(escenarioId: string): void {
    const caso = this.caso;
    const estado = this.state.estado();
    if (!caso || !estado || !caso.escenarios[escenarioId]) return;
    if (estado.escenarioActualId === escenarioId) return;

    this.state.actualizarEstado((estadoMut) => {
      estadoMut.escenarioActualId = escenarioId;
      if (!estadoMut.escenariosVisitados.includes(escenarioId)) {
        estadoMut.escenariosVisitados.push(escenarioId);
      }
    });
  }

  generarResumenPedagogico(): ResumenPedagogico | null {
    const estado = this.state.estado();
    if (!estado) return null;
    return this.trazabilidad.generarResumenPedagogico(estado, this.caso);
  }

  generarInformePedagogicoDocente() {
    const estado = this.state.estado();
    if (!estado) return null;
    return this.trazabilidad.generarInformePedagogicoDocente(estado, this.caso);
  }

  prepararSesion(caso: CasoNarrativoCompleto, partidaGuardada?: PartidaPersistida | null): void {
    const hayProgresoGuardado =
      !!partidaGuardada &&
      (partidaGuardada.estado.conversacionesCompletadas.length > 0 ||
        partidaGuardada.estado.evidenciasDescubiertas.length > 0 ||
        Object.keys(partidaGuardada.estado.flags).length > 0 ||
        partidaGuardada.estado.decisiones.length > 0 ||
        Object.values(partidaGuardada.estado.nodosVisitadosPorConversacion).some(
          (nodos) => nodos.length > 0,
        ) ||
        partidaGuardada.estado.escenariosVisitados.length > 1);

    if (hayProgresoGuardado && partidaGuardada) {
      this.state.restaurarSesion(caso, partidaGuardada.estado);
      this.state.actualizarEstado((estado) => {
        this.postProcesarEstado(estado, false);
      });
      return;
    }

    this.state.inicializarSesion(caso);
    this.state.actualizarEstado((estado) => {
      inicializarMetricasPersonajes(estado, Object.values(caso.personajes));
      inicializarMemoriaPersonajes(estado, Object.values(caso.personajes));

      for (const personaje of Object.values(caso.personajes)) {
        if (!personaje.estadosIniciales?.length) continue;
        estado.estadosPersonajes[personaje.id] = personaje.estadosIniciales.reduce(
          (acc, { clave, valor }) => ({ ...acc, [clave]: valor }),
          {} as Record<string, string | number | boolean>,
        );
      }
    });

    this.state.actualizarEstado((estado) => {
      this.postProcesarEstado(estado, false);
    });

    const escenarioInicial = caso.escenarios[caso.manifest.escenarioInicialId];
    if (escenarioInicial?.conversacionInicialId) {
      this.iniciarConversacion(escenarioInicial.conversacionInicialId);
    }
  }

  eventosRecientes(): EventoSimulacionActivado[] {
    return this.state.estado()?.eventosActivados ?? [];
  }

  objetivosCumplidos(): ObjetivoNarrativoEstado[] {
    return this.state.estado()?.objetivosCumplidos ?? [];
  }

  private procesarNodo(
    conversacionId: string,
    nodoId: string,
    estado: EstadoPartida,
  ): void {
    const caso = this.caso;
    if (!caso) return;

    const conversacion = caso.conversaciones[conversacionId];
    const nodo = conversacion?.nodos.find((n) => n.id === nodoId);
    if (!conversacion || !nodo) return;

    const visitados = estado.nodosVisitadosPorConversacion[conversacionId] ?? [];
    if (!visitados.includes(nodoId)) {
      estado.nodosVisitadosPorConversacion[conversacionId] = [...visitados, nodoId];
    }

    this.trazabilidad.registrarNodoVisitado(estado, conversacionId, nodoId);

    if (nodo.testimonio) {
      registrarAfirmacionActiva(estado, nodo.testimonio, 'testimonio', conversacionId);
    }

    aplicarEfectos(estado, nodo.efectosAlMostrar, {
      ...this.contextoBase(conversacionId, conversacion.personajeId),
      caso,
      trazabilidad: this.trazabilidad,
    });
  }

  private completarConversacion(
    conversacionId: string,
    conversacion: Conversacion,
    estado: EstadoPartida,
  ): void {
    aplicarEfectos(
      estado,
      [{ tipo: 'completar_conversacion', parametros: { conversacionId } }],
      this.contextoBase(conversacionId, conversacion.personajeId),
    );

    if (cuentaComoConversacionUtil(conversacion) && conversacion.personajeId) {
      incrementarConversacionUtil(estado, conversacion.personajeId);
      actualizarMemoriaTrasConversacionCompleta(estado, conversacion.personajeId);
    }
  }

  private postProcesarEstado(estado: EstadoPartida, avanzarTiempo = true): void {
    const caso = this.caso;
    if (!caso) return;

    const ctx = this.contextoBase();

    if (avanzarTiempo && caso.manifest.tiempoNarrativo?.minutosPorAccion) {
      estado.tiempoNarrativo = avanzarTiempoNarrativo(
        estado.tiempoNarrativo,
        caso.manifest.tiempoNarrativo.minutosPorAccion,
      );
    }

    evaluarDesbloqueosRevisita(estado, caso);
    evaluarEventosPendientes(estado, caso, ctx);
    evaluarObjetivosNarrativos(estado, caso);

    const dinamicas = detectarContradiccionesDinamicas(estado, caso);
    const predefinidas = evaluarContradiccionesPredefinidasPosibles(estado, caso);
    integrarContradiccionesPosibles(estado, [...dinamicas, ...predefinidas]);

    this.trazabilidad.sincronizarContradicciones(estado);
    this.trazabilidad.sincronizarEventos(estado, caso);
    this.trazabilidad.sincronizarObjetivos(estado, caso);
    sincronizarLibretaDesdeEstado(estado, caso);
    this.persistirPartidaSiCorresponde(estado);
  }

  /** Persiste progreso narrativo (escena visual opcional; si falta, conserva la última guardada). */
  persistirPartidaSiCorresponde(estado: EstadoPartida, escenaVisualId: string | null = null): void {
    const actual = this.state.estado();
    if (!actual) return;
    this.persistencia.guardarPartida(actual, escenaVisualId);
  }

  private mapearTipoIntervencionAEstrategia(
    tipo: IntervencionPsicologica['tipo'],
  ): EstrategiaClinica {
    const mapa: Record<IntervencionPsicologica['tipo'], EstrategiaClinica> = {
      escucha_activa: 'escucha_activa',
      evaluacion_riesgo: 'evaluacion_riesgo',
      plan_seguridad: 'planificacion_seguridad',
      psicoeducacion: 'psicoeducacion',
      derivacion: 'exploracion',
      intervencion_crisis: 'contencion_emocional',
      trabajo_familiar: 'exploracion',
      seguimiento: 'escucha_activa',
      otra: 'exploracion',
    };
    return mapa[tipo];
  }
}
