import { IndicadoresCompetencia } from './competencia.model';
import { EstrategiaClinica } from './estrategia-clinica.model';
import { EstadoContradiccionInstancia } from './contradiccion-instancia.model';
import { SoporteHipotesis } from './hipotesis-formulada.model';
import { EventoSimulacionActivado } from './evento-simulacion.model';
import { MetricasPersonaje } from './metricas-personaje.model';
import {
  CategoriaObjetivoNarrativo,
  ObjetivoNarrativoEstado,
} from './objetivo-narrativo.model';
import { TiempoNarrativo } from './tiempo-narrativo.model';

export interface RegistroConversacion {
  conversacionId: string;
  personajeId?: string;
  titulo?: string;
  iniciadaEn: string;
  completadaEn?: string;
  cuentaComoUtil: boolean;
  nodosVisitados: string[];
  opcionesSeleccionadas: string[];
}

export interface RegistroIntervencionClinica {
  id: string;
  estrategia: EstrategiaClinica;
  origen: 'dialogo' | 'intervencion_estructurada';
  conversacionId?: string;
  opcionId?: string;
  intervencionId?: string;
  personajeId?: string;
  timestamp: string;
}

export interface RegistroEvidencia {
  evidenciaId: string;
  titulo?: string;
  descubiertaEn: string;
  escenarioId?: string;
}

export interface RegistroContradiccion {
  contradiccionInstanciaId: string;
  plantillaId?: string;
  titulo: string;
  estado: EstadoContradiccionInstancia;
  creadaEn: string;
  detectadaEn?: string;
  actualizadaEn: string;
}

export interface RegistroHipotesis {
  hipotesisId: string;
  titulo?: string;
  formuladaEn: string;
  soportes: SoporteHipotesis[];
}

export interface RegistroEventoSimulacion {
  eventoId: string;
  titulo: string;
  activadoEn: string;
  tiempoNarrativo?: string;
}

export interface RegistroObjetivoNarrativo {
  objetivoId: string;
  titulo?: string;
  categoria?: CategoriaObjetivoNarrativo;
  cumplidoEn: string;
}

/** Registro estructurado para informes pedagógicos docentes. */
export interface TrazabilidadDocente {
  conversaciones: RegistroConversacion[];
  intervencionesClinicas: RegistroIntervencionClinica[];
  evidencias: RegistroEvidencia[];
  contradicciones: RegistroContradiccion[];
  hipotesis: RegistroHipotesis[];
  eventos: RegistroEventoSimulacion[];
  objetivos: RegistroObjetivoNarrativo[];
}

export function crearTrazabilidadVacia(): TrazabilidadDocente {
  return {
    conversaciones: [],
    intervencionesClinicas: [],
    evidencias: [],
    contradicciones: [],
    hipotesis: [],
    eventos: [],
    objetivos: [],
  };
}

/** Vista agregada para generación futura de informes (sin exponer competencias al estudiante). */
export interface ResumenPedagogico {
  casoId: string;
  inicioSesion: string;
  finSesion?: string;
  totalConversaciones: number;
  totalIntervencionesClinicas: number;
  totalEvidencias: number;
  totalContradicciones: number;
  totalHipotesis: number;
  estrategiasUtilizadas: Partial<Record<EstrategiaClinica, number>>;
  trazabilidad: TrazabilidadDocente;
}

/** Informe completo para docentes: incluye competencias ocultas y métricas finales. */
export interface InformePedagogicoDocente extends ResumenPedagogico {
  competencias: IndicadoresCompetencia;
  metricasFinalesPersonajes: Record<string, MetricasPersonaje>;
  conversacionesUtilesConsumidas: Record<string, number>;
  tiempoNarrativoFinal: TiempoNarrativo;
  eventosActivados: EventoSimulacionActivado[];
  objetivosCumplidos: ObjetivoNarrativoEstado[];
}
