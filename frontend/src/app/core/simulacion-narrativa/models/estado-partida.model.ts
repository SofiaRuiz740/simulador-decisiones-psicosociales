import { AfirmacionActiva } from './afirmacion.model';
import { IndicadoresCompetencia, COMPETENCIAS_INICIALES } from './competencia.model';
import { ContradiccionInstancia } from './contradiccion-instancia.model';
import { EventoSimulacionActivado } from './evento-simulacion.model';
import { HipotesisFormuladaRuntime } from './hipotesis-formulada.model';
import { crearLibretaVacia, LibretaPsicologo } from './libreta.model';
import { MemoriaPersonajeEstado } from './memoria-narrativa.model';
import { MetricasPersonaje } from './metricas-personaje.model';
import { ObjetivoNarrativoEstado } from './objetivo-narrativo.model';
import { TiempoNarrativo, crearTiempoNarrativo } from './tiempo-narrativo.model';
import { TrazabilidadDocente, crearTrazabilidadVacia } from './trazabilidad.model';

export interface DecisionRegistrada {
  id: string;
  tipo: string;
  entidadId: string;
  opcionId?: string;
  timestamp: string;
  contexto?: string;
}

/** Entrada del log de ejecución (no confundir con EventoSimulacion configurable). */
export interface RegistroHistorial {
  tipo: string;
  entidadId: string;
  descripcion?: string;
  timestamp: string;
}

/** @deprecated Usar RegistroHistorial. */
export type EventoNarrativo = RegistroHistorial;

export interface EstadoPartida {
  casoId: string;
  escenarioActualId: string;
  flags: Record<string, boolean>;
  evidenciasDescubiertas: string[];
  hipotesisFormuladas: string[];
  /** Hipótesis con vínculos runtime a evidencias, testimonios o contradicciones. */
  hipotesisConSoporte: HipotesisFormuladaRuntime[];
  contradiccionesIdentificadas: string[];
  instanciasContradiccion: ContradiccionInstancia[];
  afirmacionesActivas: AfirmacionActiva[];
  intervencionesAplicadas: string[];
  conversacionesCompletadas: string[];
  conversacionesEnFatiga: string[];
  /** Conversaciones de revisita desbloqueadas (exentas de fatiga). */
  conversacionesRevisitaDesbloqueadas: string[];
  nodosConversacionActivos: Record<string, string>;
  nodosVisitadosPorConversacion: Record<string, string[]>;
  estadosPersonajes: Record<string, Record<string, string | number | boolean>>;
  metricasPersonajes: Record<string, MetricasPersonaje>;
  conversacionesUtilesPorPersonaje: Record<string, number>;
  /** Cupo extra de conversaciones otorgado por eventos o revisita. */
  bonusConversacionesUtiles: Record<string, number>;
  memoriaPersonajes: Record<string, MemoriaPersonajeEstado>;
  tiempoNarrativo: TiempoNarrativo;
  eventosActivados: EventoSimulacionActivado[];
  objetivosCumplidos: ObjetivoNarrativoEstado[];
  competencias: IndicadoresCompetencia;
  trazabilidad: TrazabilidadDocente;
  libreta: LibretaPsicologo;
  escenariosVisitados: string[];
  decisiones: DecisionRegistrada[];
  historial: RegistroHistorial[];
  inicioSesion: string;
}

export function crearEstadoPartidaInicial(
  casoId: string,
  escenarioInicialId: string,
  tiempoInicial?: TiempoNarrativo,
): EstadoPartida {
  const ahora = new Date().toISOString();
  return {
    casoId,
    escenarioActualId: escenarioInicialId,
    flags: {},
    evidenciasDescubiertas: [],
    hipotesisFormuladas: [],
    hipotesisConSoporte: [],
    contradiccionesIdentificadas: [],
    instanciasContradiccion: [],
    afirmacionesActivas: [],
    intervencionesAplicadas: [],
    conversacionesCompletadas: [],
    conversacionesEnFatiga: [],
    conversacionesRevisitaDesbloqueadas: [],
    nodosConversacionActivos: {},
    nodosVisitadosPorConversacion: {},
    estadosPersonajes: {},
    metricasPersonajes: {},
    conversacionesUtilesPorPersonaje: {},
    bonusConversacionesUtiles: {},
    memoriaPersonajes: {},
    tiempoNarrativo: tiempoInicial ?? crearTiempoNarrativo({ dia: 1, hora: 23, minuto: 50 }),
    eventosActivados: [],
    objetivosCumplidos: [],
    competencias: { ...COMPETENCIAS_INICIALES },
    trazabilidad: crearTrazabilidadVacia(),
    libreta: crearLibretaVacia(),
    escenariosVisitados: [escenarioInicialId],
    decisiones: [],
    historial: [],
    inicioSesion: ahora,
  };
}
