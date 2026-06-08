import { AfirmacionActiva } from './afirmacion.model';

export type EstadoContradiccionInstancia =
  | 'posible'
  | 'detectada'
  | 'analizada'
  | 'resuelta'
  | 'descartada';

export type OrigenContradiccion =
  | 'evidencia_evidencia'
  | 'testimonio_testimonio'
  | 'evidencia_testimonio'
  | 'predefinida';

/** Instancia de contradicción generada en tiempo de ejecución o activada desde JSON. */
export interface ContradiccionInstancia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: OrigenContradiccion;
  plantillaId?: string;
  afirmacionesEnConflicto: AfirmacionActiva[];
  estado: EstadoContradiccionInstancia;
  /** Momento en que el motor registró la contradicción como posible. */
  creadaEn: string;
  /** Momento en que el estudiante la identificó explícitamente. */
  detectadaEn?: string;
  actualizadaEn: string;
}

export interface ReglaContradiccionDinamica {
  id: string;
  titulo: string;
  descripcion: string;
  origen: OrigenContradiccion;
  tema: string;
  severidad?: 'leve' | 'moderada' | 'grave';
}

export function esContradiccionIdentificadaPorEstudiante(
  instancia: ContradiccionInstancia,
): boolean {
  return (
    instancia.estado === 'detectada' ||
    instancia.estado === 'analizada' ||
    instancia.estado === 'resuelta'
  );
}
