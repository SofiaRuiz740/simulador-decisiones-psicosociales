/**
 * Proposición verificable extraída de evidencias o testimonios.
 * Base para la detección dinámica de contradicciones.
 */
export interface Afirmacion {
  id: string;
  tema: string;
  valor: string;
  descripcion?: string;
  personajeId?: string;
}

export type OrigenAfirmacion = 'evidencia' | 'testimonio';

export interface AfirmacionActiva {
  afirmacion: Afirmacion;
  origen: OrigenAfirmacion;
  entidadId: string;
  registradaEn: string;
}
