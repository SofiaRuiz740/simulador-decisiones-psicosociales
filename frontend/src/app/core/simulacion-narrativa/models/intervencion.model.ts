import { Condicion } from './condicion.model';
import { Efecto } from './efecto.model';

export type TipoIntervencion =
  | 'escucha_activa'
  | 'evaluacion_riesgo'
  | 'plan_seguridad'
  | 'psicoeducacion'
  | 'derivacion'
  | 'intervencion_crisis'
  | 'trabajo_familiar'
  | 'seguimiento'
  | 'otra';

export interface PasoIntervencion {
  orden: number;
  descripcion: string;
  orientacionClinica?: string;
}

/**
 * Acción terapéutica que el estudiante puede aplicar durante la simulación.
 * Las consecuencias son narrativas; no existe evaluación de acierto durante la partida.
 */
export interface IntervencionPsicologica {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoIntervencion;
  enfoqueTeorico?: string;
  pasos: PasoIntervencion[];
  personajesObjetivo?: string[];
  requisitosActivacion?: Condicion[];
  efectosNarrativos?: Efecto[];
  consideracionesEticas?: string[];
}
