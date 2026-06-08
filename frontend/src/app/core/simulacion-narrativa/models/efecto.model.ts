/**
 * Efectos narrativos que resultan de las decisiones del estudiante.
 * No evalúan corrección: solo modifican el estado de la simulación.
 */

export type TipoEfecto =
  | 'establecer_flag'
  | 'descubrir_evidencia'
  | 'formular_hipotesis'
  | 'identificar_contradiccion'
  | 'aplicar_intervencion'
  | 'cambiar_estado_personaje'
  | 'modificar_metrica_personaje'
  | 'modificar_competencia'
  | 'desbloquear_conversacion'
  | 'desbloquear_escenario'
  | 'desbloquear_conversacion_revisita'
  | 'restablecer_conversaciones_utiles'
  | 'activar_evento_simulacion'
  | 'avanzar_tiempo_narrativo'
  | 'establecer_tiempo_narrativo'
  | 'registrar_decision'
  | 'registrar_intervencion_clinica'
  | 'avanzar_nodo_conversacion'
  | 'completar_conversacion';

export interface Efecto {
  tipo: TipoEfecto;
  parametros: Record<string, string | number | boolean | string[]>;
}
