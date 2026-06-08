import { EstadoPractica } from './practicas.model';

/** Práctica devuelta por el acceso estudiante (JWT + localStorage). */
export interface PracticaEstudianteActiva {
  id: number;
  nombre: string;
  caso_id: number;
  caso_nombre: string;
  tiempo_max_min: number;
  fecha_inicio: string;
  fecha_fin: string;
  mensaje_personalizado: string;
  estado: EstadoPractica;
  autorizacion_id?: number;
}

export type EstadoPracticaEstudiante = 'no_iniciada' | 'en_progreso' | 'completada';

export interface ProgresoPracticaLocal {
  practicaId: number;
  casoNarrativoId: string;
  porcentaje: number;
  estado: EstadoPracticaEstudiante;
  ultimaActividad: string;
  conversacionesCompletadas: number;
  conversacionesTotales: number;
  resultadoId?: number;
}

export interface PracticaEstudianteRegistro extends PracticaEstudianteActiva {
  autorizacion_id: number;
  progreso: ProgresoPracticaLocal;
}
