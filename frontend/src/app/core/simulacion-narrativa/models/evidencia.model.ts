import { Condicion } from './condicion.model';
import { Afirmacion } from './afirmacion.model';

export type TipoEvidencia =
  | 'documento'
  | 'testimonio'
  | 'observacion'
  | 'registro_clinico'
  | 'comunicacion'
  | 'material_forense'
  | 'otro';

export interface Evidencia {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoEvidencia;
  contenido?: string;
  fuentePersonajeId?: string;
  escenarioDescubrimientoId?: string;
  requisitosDescubrimiento?: Condicion[];
  etiquetas?: string[];
  recursoUrl?: string;
  /** Afirmaciones verificables para detección dinámica de contradicciones. */
  afirmaciones?: Afirmacion[];
}
