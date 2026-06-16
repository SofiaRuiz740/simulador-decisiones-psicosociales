/** Modelos TS para Practicas, Participaciones y Resultados. */

import { CasoDetalle, Pregunta, Respuesta } from './casos.model';

export enum EstadoPractica {
  SinIniciar = 'SIN_INICIAR',
  EnCurso = 'EN_CURSO',
  Finalizada = 'FINALIZADA',
  Cancelada = 'CANCELADA',
}

export enum EstadoParticipacion {
  NoIniciada = 'NO_INICIADA',
  EnCurso = 'EN_CURSO',
  Finalizada = 'FINALIZADA',
  Incompleta = 'INCOMPLETA',
}

export interface Autorizacion {
  id: number;
  practica: number;
  estudiante: number;
  estudiante_correo: string;
  estudiante_nombre: string;
  codigo_acceso: string;
  notificado: boolean;
  reintento_autorizado: boolean;
  revocada: boolean;
  revocada_en: string | null;
  revocada_motivo: string;
  fecha_creacion: string;
}

export interface Practica {
  id: number;
  nombre: string;
  caso: number;
  caso_nombre: string;
  docente: number;
  materia: number | null;
  grupo: number | null;
  materia_display: string | null;
  grupos_display: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  tiempo_max_min: number;
  lugar_fisico: string;
  mensaje_personalizado: string;
  estado: EstadoPractica;
  estado_display: string;
  autorizaciones_count: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface PracticaDetalle extends Practica {
  autorizaciones: Autorizacion[];
}

export interface PracticaInput {
  nombre: string;
  caso: number;
  materia?: number | null;
  grupo?: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  tiempo_max_min?: number;
  lugar_fisico?: string;
  mensaje_personalizado?: string;
}

export interface MisPracticaEstudiante {
  id: number | null;
  autorizacion_id: number;
  practica_id: number;
  practica_nombre: string;
  caso_nombre: string;
  codigo_acceso: string;
  materia_display: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  tiempo_max_min: number;
  practica_estado: EstadoPractica | string;
  practica_estado_display: string;
  estado: EstadoParticipacion | string;
  estado_display: string;
  progreso_pct: number;
  total_preguntas: number;
  respondidas: number;
  tiempo_usado_seg: number;
  tiempo_restante_seg: number;
  nota_final: number | null;
}

export interface AutorizacionListItem {
  id: number;
  practica_id: number;
  practica_nombre: string;
  practica_estado: EstadoPractica | string;
  practica_estado_display: string;
  estudiante_id: number;
  estudiante_nombre: string;
  estudiante_correo: string;
  grupos_display: string | null;
  codigo_acceso: string;
  asignacion_display: string;
  reintento_autorizado: boolean;
  fecha_creacion: string;
}

// ---- Acceso estudiante ----

export interface AccesoEstudianteRespuesta {
  access: string;
  refresh: string;
  estudiante: { id: number; correo: string; nombre_completo: string };
  practica: {
    id: number;
    nombre: string;
    caso_id: number;
    caso_nombre: string;
    tiempo_max_min: number;
    fecha_inicio: string;
    fecha_fin: string;
    mensaje_personalizado: string;
    estado: EstadoPractica;
  };
  autorizacion_id: number;
}

// ---- Participaciones ----

export interface RespuestaSeleccionada {
  id: number;
  participacion: number;
  pregunta: number;
  respuesta_elegida: number;
  timestamp: string;
}

export interface Participacion {
  id: number;
  practica: number;
  practica_nombre: string;
  estudiante: number;
  estudiante_correo: string;
  estudiante_nombre: string;
  autorizacion: number;
  inicio: string | null;
  fin: string | null;
  tiempo_usado_seg: number;
  estado: EstadoParticipacion;
  estado_display: string;
  respuestas_seleccionadas: RespuestaSeleccionada[];
  caso?: CasoDetalle;
}

export interface ProgresoParticipacion {
  participacion_id: number;
  estado: EstadoParticipacion;
  total_preguntas: number;
  respondidas: number;
  tiempo_usado_seg: number;
  tiempo_restante_seg: number;
}

/** Fila de seguimiento docente (GET /participaciones/). */
export interface SeguimientoParticipacion {
  id: number | null;
  autorizacion_id: number;
  estudiante_id: number;
  estudiante_nombre: string;
  estudiante_correo: string;
  practica_id: number;
  practica_nombre: string;
  caso_id: number;
  caso_nombre: string;
  estado: EstadoParticipacion | string;
  estado_display: string;
  progreso_pct: number;
  total_preguntas: number;
  respondidas: number;
  tiempo_usado_seg: number;
  tiempo_restante_seg: number;
  intentos: number;
}

export interface MetricasParticipacion {
  autorizados: number;
  en_curso: number;
  finalizados: number;
  pendientes: number;
}

// ---- Resultados ----

export interface DetallePreguntaResultado {
  pregunta_id: number;
  enunciado: string;
  peso: number;
  /** Si false: pregunta narrativa/exploratoria, no afecta nota (req. 3). */
  calificable?: boolean;
  /** Competencia asociada (criterio de rúbrica). */
  competencia_id?: string;
  competencia_nombre?: string;
  escenario_orden?: number;
  pregunta_orden?: number;
  respondida: boolean;
  /** True si la respuesta del estudiante fue correcta. */
  es_acertada?: boolean;
  respuesta_elegida: Respuesta | null;
  respuestas_correctas: Respuesta[];
  /** Retroalimentación pedagógica por competencia (req. 4 y 6). */
  retroalimentacion_competencia?: string;
}

/** Resumen agregado por competencia para el panel estudiante (req. 6). */
export interface CompetenciaResumen {
  id: string;
  nombre: string;
  acertadas: number;
  total: number;
  porcentaje: number;
  /** Solo presente si el estudiante no alcanzó el 100% en esa competencia. */
  retroalimentacion?: string;
}

export interface DesgloseCriterio {
  criterio_id: string;
  nombre: string;
  peso: number;
  peso_total: number;
  peso_obtenido: number;
  porcentaje: number;
  nivel_alcanzado: {
    nivel: number;
    nombre: string;
    descriptor: string;
  } | null;
}

export interface Resultado {
  id: number;
  participacion: number;
  estudiante_correo: string;
  estudiante_nombre: string;
  practica_id: number;
  practica_nombre: string;
  caso_nombre: string;
  materia_display: string | null;
  grupos_display: string | null;
  tiempo_usado_seg: number;
  participacion_estado: string;
  correctas: number;
  incorrectas: number;
  no_respondidas: number;
  peso_obtenido: number;
  peso_total: number;
  nota_final: string;
  aprobado: boolean;
  nota_aprobacion: number;
  /** Escala máxima de la nota (típicamente 100 o 5). */
  escala_maxima?: number;
  rubrica_descripcion: string;
  desglose_criterios: DesgloseCriterio[];
  feedback_docente: string;
  notificado_estudiante: boolean;
  fecha_calculo: string;
  fecha_actualizacion: string;
  detalle_preguntas: DetallePreguntaResultado[];
  /** Resumen agregado por competencia (req. 6). */
  competencias?: CompetenciaResumen[];
}

export interface SolicitudReapertura {
  id: number;
  estudiante_id: number;
  estudiante_nombre: string;
  estudiante_correo: string;
  practica_id: number;
  practica_nombre: string;
  autorizacion_id: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  estado_display: string;
  motivo: string;
  mensaje_resolucion: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

export interface RegistroReinicio {
  id: number;
  practica_id: number;
  practica_nombre: string;
  docente_nombre: string;
  estudiante_nombre: string | null;
  alcance: 'INDIVIDUAL' | 'GLOBAL';
  alcance_display: string;
  motivo: string;
  estudiantes_afectados: number;
  fecha: string;
}

export interface ResultadoNarrativo {
  id: number;
  practica_id: number;
  practica_nombre: string;
  caso_nombre: string;
  estudiante_id?: number;
  estudiante_nombre?: string;
  estudiante_correo?: string;
  porcentaje: number;
  entrevistas_realizadas: number;
  entrevistas_totales: number;
  evidencias_encontradas: number;
  contradicciones_detectadas: number;
  hipotesis_formuladas: number;
  estado_final: string;
  fortalezas: string[];
  aspectos_mejorar: string[];
  fecha_finalizacion: string;
}
