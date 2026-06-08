/** Modelos TS alineados con apps.casos del backend. */

export enum EstadoCaso {
  Borrador = 'BORRADOR',
  Importado = 'IMPORTADO',
  GeneradoIA = 'GENERADO_IA',
  EnRevision = 'EN_REVISION',
  Validado = 'VALIDADO',
  Archivado = 'ARCHIVADO',
}

export interface Respuesta {
  id: number;
  pregunta: number;
  orden: number;
  texto: string;
  es_correcta: boolean;
  justificacion: string;
  retroalimentacion: string;
}

export interface Pregunta {
  id: number;
  escenario: number;
  orden: number;
  enunciado: string;
  peso: number;
  criterio_rubrica_id: string;
  respuestas: Respuesta[];
}

export type RecursoMultimediaTipo = 'imagen' | 'audio' | 'video';

export interface RecursoMultimedia {
  tipo: RecursoMultimediaTipo;
  url: string;
  titulo?: string;
}

export interface Escenario {
  id: number;
  caso: number;
  orden: number;
  titulo: string;
  narrativa: string;
  /** Recursos asociados al escenario. Formato unificado:
   * `{tipo: 'imagen'|'audio'|'video', url, titulo?}`.
   * Mantiene retrocompat con strings antiguos (se interpretan como imagen).
   */
  recursos_multimedia: (RecursoMultimedia | string)[];
  preguntas: Pregunta[];
}

export interface NivelDesempeno {
  nivel: number;
  nombre: string;
  descriptor: string;
}

export interface CriterioRubrica {
  id: string;
  nombre: string;
  descripcion: string;
  peso: number;
  niveles: NivelDesempeno[];
}

export interface Rubrica {
  id: number;
  caso: number;
  descripcion: string;
  escala_maxima: number;
  nota_aprobacion: number;
  criterios: CriterioRubrica[];
  niveles_globales: NivelDesempeno[];
  suma_pesos_criterios: number;
  es_consistente: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface RubricaInput {
  descripcion?: string;
  escala_maxima?: number;
  nota_aprobacion?: number;
  criterios?: CriterioRubrica[];
  niveles_globales?: NivelDesempeno[];
}

export interface CasoListItem {
  id: number;
  nombre: string;
  descripcion: string;
  area_psicosocial: string;
  tiempo_estimado_min: number;
  estado: EstadoCaso;
  estado_display: string;
  docente_creador: number;
  docente_creador_username: string;
  escenarios_count: number;
  preguntas_count: number;
  tiene_rubrica: boolean;
  rubrica_resumen: string | null;
  completitud_pct: number;
  materia: number | null;
  materia_display: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CasoDetalle extends CasoListItem {
  desarrollo_situacional: string;
  contexto_historia: string;
  escenarios: Escenario[];
  rubrica?: Rubrica | null;
}

export interface CasoInput {
  nombre: string;
  descripcion?: string;
  desarrollo_situacional?: string;
  contexto_historia?: string;
  area_psicosocial?: string;
  tiempo_estimado_min?: number;
  estado?: EstadoCaso;
  materia?: number | null;
}

export interface EscenarioInput {
  caso: number;
  orden: number;
  titulo: string;
  narrativa?: string;
  recursos_multimedia?: (RecursoMultimedia | string)[];
}

export interface PreguntaInput {
  escenario: number;
  orden: number;
  enunciado: string;
  peso?: number;
  criterio_rubrica_id?: string;
}

export interface RespuestaInput {
  pregunta: number;
  orden: number;
  texto: string;
  es_correcta?: boolean;
  justificacion?: string;
  retroalimentacion?: string;
}
