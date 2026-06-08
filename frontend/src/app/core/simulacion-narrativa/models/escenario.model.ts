import { Condicion } from './condicion.model';
import { Efecto } from './efecto.model';
import { VarianteEscenario } from './mundo-dinamico.model';

export interface TransicionEscenario {
  id: string;
  escenarioDestinoId: string;
  etiqueta?: string;
  requisitos?: Condicion[];
  efectos?: Efecto[];
}

export interface Escenario {
  id: string;
  orden: number;
  titulo: string;
  narrativa: string;
  ubicacion?: string;
  momentoTemporal?: string;
  personajesPresentes: string[];
  conversacionInicialId?: string;
  conversacionesDisponibles?: string[];
  evidenciasDisponibles?: string[];
  intervencionesDisponibles?: string[];
  requisitosAcceso?: Condicion[];
  transiciones?: TransicionEscenario[];
  recursosMultimedia?: string[];
  /** Variantes que modifican la presentación del escenario según el avance investigativo. */
  variantes?: VarianteEscenario[];
}
