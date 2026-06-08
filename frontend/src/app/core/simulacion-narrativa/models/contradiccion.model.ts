import { Condicion } from './condicion.model';
import { ReglaContradiccionDinamica } from './contradiccion-instancia.model';

export type SeveridadContradiccion = 'leve' | 'moderada' | 'grave';

/** Plantilla de contradicción que puede activarse por condiciones o detección dinámica. */
export interface Contradiccion {
  id: string;
  titulo: string;
  descripcion: string;
  evidenciasInvolucradas?: string[];
  personajesInvolucrados?: string[];
  requisitosRevelacion?: Condicion[];
  severidad?: SeveridadContradiccion;
  preguntasReflexion?: string[];
  /** Tema para vincular con afirmaciones en conflicto. */
  tema?: string;
}

export type { ReglaContradiccionDinamica };
