import { Condicion } from './condicion.model';

/** Variante de un escenario que reemplaza narrativa y accesos cuando se cumplen condiciones. */
export interface VarianteEscenario {
  id: string;
  titulo?: string;
  narrativa: string;
  ubicacion?: string;
  momentoTemporal?: string;
  requisitos: Condicion[];
  conversacionesDisponibles?: string[];
  evidenciasDisponibles?: string[];
  intervencionesDisponibles?: string[];
  personajesPresentes?: string[];
  prioridad?: number;
}

/** Vista resuelta de un escenario tras aplicar variantes del mundo dinámico. */
export interface EscenarioResuelto {
  id: string;
  orden: number;
  titulo: string;
  narrativa: string;
  ubicacion?: string;
  momentoTemporal?: string;
  personajesPresentes: string[];
  conversacionesDisponibles: string[];
  evidenciasDisponibles: string[];
  intervencionesDisponibles: string[];
  varianteActivaId?: string;
  escenarioBase: import('./escenario.model').Escenario;
}
