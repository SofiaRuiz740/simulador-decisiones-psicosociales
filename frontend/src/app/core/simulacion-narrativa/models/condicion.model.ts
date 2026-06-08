/**
 * Sistema de condiciones genérico y orientado a datos.
 * Permite expresar requisitos de desbloqueo sin lógica hardcodeada por caso.
 */

export type TipoCondicion =
  | 'flag_activo'
  | 'evidencia_descubierta'
  | 'todas_evidencias_descubiertas'
  | 'alguna_evidencia_descubierta'
  | 'hipotesis_formulada'
  | 'contradiccion_identificada'
  | 'contradiccion_estado'
  | 'escenario_visitado'
  | 'conversacion_completada'
  | 'escenario_conversaciones_completadas'
  | 'intervencion_aplicada'
  | 'decision_registrada'
  | 'personaje_estado'
  | 'personaje_metrica_minima'
  | 'personaje_conversaciones_disponibles'
  | 'evento_simulacion_activado'
  | 'objetivo_cumplido'
  | 'tiempo_narrativo_minimo'
  | 'dia_narrativo_minimo'
  | 'y'
  | 'o'
  | 'no';

export interface Condicion {
  tipo: TipoCondicion;
  parametros?: Record<string, string | number | boolean | string[]>;
  condiciones?: Condicion[];
}
