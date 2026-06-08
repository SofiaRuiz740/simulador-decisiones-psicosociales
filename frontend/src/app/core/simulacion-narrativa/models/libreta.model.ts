import { EstadoContradiccionInstancia } from './contradiccion-instancia.model';
import { SoporteHipotesis } from './hipotesis-formulada.model';
import { MetricasPersonaje } from './metricas-personaje.model';

export interface PersonaEntrevistadaLibreta {
  personajeId: string;
  nombre?: string;
  conversacionesIds: string[];
  ultimaInteraccion?: string;
}

export interface EvidenciaLibreta {
  evidenciaId: string;
  titulo?: string;
  descubiertaEn: string;
  escenarioId?: string;
}

export interface ContradiccionLibreta {
  instanciaId: string;
  plantillaId?: string;
  titulo: string;
  descripcion: string;
  estado: EstadoContradiccionInstancia;
  creadaEn: string;
  detectadaEn?: string;
  afirmacionIds: string[];
}

export interface HipotesisLibreta {
  hipotesisId: string;
  titulo?: string;
  formuladaEn: string;
  soportes: SoporteHipotesis[];
}

export interface EstadoEmocionalPercibidoLibreta {
  personajeId: string;
  nombre?: string;
  metricas: MetricasPersonaje;
  actualizadoEn: string;
}

export type TipoEntradaLineaTemporal =
  | 'conversacion'
  | 'evidencia'
  | 'contradiccion'
  | 'hipotesis'
  | 'evento'
  | 'intervencion'
  | 'nota';

export interface EntradaLineaTemporalLibreta {
  id: string;
  tipo: TipoEntradaLineaTemporal;
  entidadId: string;
  titulo?: string;
  timestamp: string;
  tiempoNarrativo?: string;
}

export interface NotaEstudianteLibreta {
  id: string;
  contenido: string;
  creadaEn: string;
  vinculos?: { tipo: string; entidadId: string }[];
}

/** Cuaderno clínico del estudiante derivado del estado de partida. */
export interface LibretaPsicologo {
  personasEntrevistadas: PersonaEntrevistadaLibreta[];
  evidenciasEncontradas: EvidenciaLibreta[];
  contradiccionesDetectadas: ContradiccionLibreta[];
  hipotesisFormuladas: HipotesisLibreta[];
  estadosEmocionalesPercibidos: EstadoEmocionalPercibidoLibreta[];
  lineaTemporal: EntradaLineaTemporalLibreta[];
  notasEstudiante: NotaEstudianteLibreta[];
}

export function crearLibretaVacia(): LibretaPsicologo {
  return {
    personasEntrevistadas: [],
    evidenciasEncontradas: [],
    contradiccionesDetectadas: [],
    hipotesisFormuladas: [],
    estadosEmocionalesPercibidos: [],
    lineaTemporal: [],
    notasEstudiante: [],
  };
}
