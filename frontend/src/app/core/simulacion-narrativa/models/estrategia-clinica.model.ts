import { ModificadoresMetricas } from './metricas-personaje.model';
import { ModificadoresCompetencia } from './competencia.model';

/** Estrategias profesionales representadas por opciones de diálogo e intervenciones. */
export type EstrategiaClinica =
  | 'escucha_activa'
  | 'validacion_emocional'
  | 'contencion_emocional'
  | 'psicoeducacion'
  | 'exploracion'
  | 'confrontacion'
  | 'evaluacion_riesgo'
  | 'planificacion_seguridad';

export interface PerfilEstrategiaClinica {
  metricas?: ModificadoresMetricas;
  competencias?: ModificadoresCompetencia;
}

/** Perfiles por defecto del motor; pueden sobrescribirse desde el manifest del caso. */
export const PERFILES_ESTRATEGIA_CLINICA: Record<EstrategiaClinica, PerfilEstrategiaClinica> = {
  escucha_activa: {
    metricas: { confianza: 10, ansiedad: -8, colaboracion: 5, aperturaEmocional: 6 },
    competencias: { empatia_clinica: 10, comunicacion_terapeutica: 12 },
  },
  validacion_emocional: {
    metricas: { confianza: 8, ansiedad: -10, colaboracion: 4, aperturaEmocional: 15 },
    competencias: { empatia_clinica: 12, comunicacion_terapeutica: 8 },
  },
  contencion_emocional: {
    metricas: { confianza: 6, ansiedad: -12, colaboracion: 3, aperturaEmocional: 8 },
    competencias: { empatia_clinica: 8, manejo_crisis: 6, comunicacion_terapeutica: 6 },
  },
  psicoeducacion: {
    metricas: { confianza: 5, ansiedad: -4, colaboracion: 6, aperturaEmocional: 4 },
    competencias: { comunicacion_terapeutica: 8, pensamiento_critico: 4 },
  },
  exploracion: {
    metricas: { confianza: 2, ansiedad: 4, colaboracion: 3, aperturaEmocional: 5 },
    competencias: { capacidad_investigativa: 10, pensamiento_critico: 6 },
  },
  confrontacion: {
    metricas: { confianza: -15, ansiedad: 12, colaboracion: -10, aperturaEmocional: -8 },
    competencias: { comunicacion_terapeutica: -5, empatia_clinica: -8 },
  },
  evaluacion_riesgo: {
    metricas: { confianza: -2, ansiedad: 6, colaboracion: 2, aperturaEmocional: 3 },
    competencias: { evaluacion_riesgo: 15, pensamiento_critico: 10, capacidad_investigativa: 6 },
  },
  planificacion_seguridad: {
    metricas: { confianza: 4, ansiedad: -6, colaboracion: 8, aperturaEmocional: 5 },
    competencias: { manejo_crisis: 15, evaluacion_riesgo: 10, pensamiento_critico: 8 },
  },
};
