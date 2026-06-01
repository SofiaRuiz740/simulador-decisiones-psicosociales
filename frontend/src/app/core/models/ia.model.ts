/**
 * Modelos TS del módulo de IA generativa.
 * Espejo de los serializers en backend/apps/ia_generativa/serializers.py.
 */

export enum EstadoPropuestaIA {
  Borrador = 'BORRADOR',
  EnRevision = 'EN_REVISION',
  Aprobado = 'APROBADO',
  Rechazado = 'RECHAZADO',
  ConvertidoEnCaso = 'CONVERTIDO_EN_CASO',
}

export type NivelDificultad = 'bajo' | 'medio' | 'alto';

export interface GenerarCasoInput {
  tema: string;
  objetivo_aprendizaje: string;
  nivel_dificultad: NivelDificultad;
  numero_escenarios: number;
  numero_preguntas_por_escenario: number;
  tono: string;
}

/** Estructura "rica" del contenido_json devuelto por la IA. */
export interface ContenidoIA {
  titulo: string;
  descripcion: string;
  objetivo_aprendizaje: string;
  area_psicologia_social: string;
  nivel_dificultad: string;
  tiempo_estimado: number;
  storytelling: {
    introduccion: string;
    personaje_principal: string;
    contexto_general: string;
    conflicto_central: string;
    tono_narrativo: string;
    objetivo_del_estudiante: string;
  };
  escenarios: EscenarioIA[];
  rubrica: {
    criterios: {
      nombre: string;
      descripcion: string;
      puntaje_maximo: number;
      niveles: { nivel: string; descripcion: string; puntaje: number }[];
    }[];
  };
  retroalimentacion_general: string;
  recomendaciones_docente: string;
}

export interface EscenarioIA {
  titulo: string;
  contexto: string;
  narrativa: string;
  ambiente_visual_sugerido: string;
  emocion_principal: string;
  decision_clave: string;
  preguntas: PreguntaIA[];
}

export interface PreguntaIA {
  enunciado: string;
  tipo: 'seleccion_unica' | string;
  opciones: OpcionIA[];
}

export interface OpcionIA {
  texto: string;
  es_correcta: boolean;
  justificacion: string;
  retroalimentacion: string;
  impacto_narrativo: string;
}

export interface PropuestaCasoIA {
  id: number;
  titulo: string;
  tema: string;
  objetivo_aprendizaje: string;
  nivel_dificultad: string;
  numero_escenarios: number;
  numero_preguntas_por_escenario: number;
  tono: string;
  estado: EstadoPropuestaIA;
  estado_display: string;
  motivo_rechazo: string;
  generada_con_llm: boolean;
  caso_resultante_id: number | null;
  contenido_json: ContenidoIA;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_aprobacion: string | null;
}

export interface ConvertirEnCasoResultado {
  detail: string;
  caso_id: number;
  caso_nombre: string;
  propuesta: PropuestaCasoIA;
}

export interface EstadoIA {
  proveedor_activo: boolean;
}
