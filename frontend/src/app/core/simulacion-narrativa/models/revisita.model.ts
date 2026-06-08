import { Condicion } from './condicion.model';

/** Permite reabrir conversaciones con personajes agotados tras un descubrimiento o evento. */
export interface DesbloqueoRevisita {
  id: string;
  personajeId: string;
  conversacionId: string;
  requisitos: Condicion[];
  /** Conversaciones útiles adicionales otorgadas al personaje. */
  conversacionesUtilesExtra?: number;
  /** Si es true, la conversación no consume cupo de fatiga. */
  exentaFatiga?: boolean;
}
