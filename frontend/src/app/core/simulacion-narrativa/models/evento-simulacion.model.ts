import { Condicion } from './condicion.model';
import { Efecto } from './efecto.model';

/**
 * Situación narrativa configurable que se activa al cumplir condiciones.
 * Distinto de `RegistroHistorial` (log de ejecución en estado de partida).
 */
export interface EventoSimulacion {
  id: string;
  titulo: string;
  descripcion: string;
  requisitosActivacion: Condicion[];
  efectos?: Efecto[];
  /** Por defecto true: solo se activa una vez. */
  activableUnaVez?: boolean;
  prioridad?: number;
  /** Avance de tiempo narrativo al activarse (minutos). */
  avanceTiempoMinutos?: number;
}

export interface EventoSimulacionActivado {
  eventoId: string;
  titulo: string;
  activadoEn: string;
  tiempoNarrativo?: string;
}
