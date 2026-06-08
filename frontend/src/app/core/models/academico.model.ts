/** Modelos TypeScript alineados con apps.academico del backend. */

export interface Estudiante {
  id: number;
  correo: string;
  identificacion?: string;
  first_name: string;
  last_name: string;
  nombre_completo: string;
  activo: boolean;
  docente_creador: number;
  docente_creador_username: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  /** Solo en listado docente. */
  grupos_display?: string | null;
  materia_display?: string | null;
  ultima_practica?: { nombre: string; fecha: string } | null;
  ultima_nota?: number | null;
  sin_grupo?: boolean;
  /** Solo presente en respuesta de agregar-por-correo: true si se creó, false si ya existía. */
  _creado?: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  programa: string;
  periodo: string;
  activo: boolean;
  docente: number;
  grupos_count: number;
  estudiantes_count: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface MateriaInput {
  nombre: string;
  programa?: string;
  periodo?: string;
  activo?: boolean;
}

export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
  periodo: string;
  materia: number | null;
  materia_nombre?: string | null;
  materia_display?: string | null;
  periodo_display?: string | null;
  docente: number;
  estudiantes_count: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface GrupoDetalle extends Grupo {
  estudiantes: Estudiante[];
}

/** Estructura estándar de paginación de DRF. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Payload para crear/editar Estudiante directamente. */
export interface EstudianteInput {
  correo: string;
  first_name: string;
  last_name: string;
  identificacion?: string;
  activo?: boolean;
}

/** Payload para agregar/vincular por correo. */
export interface AgregarPorCorreoInput {
  correo: string;
  first_name?: string;
  last_name?: string;
}

/** Payload para crear/editar Grupo. */
export interface GrupoInput {
  nombre: string;
  descripcion: string;
  periodo?: string;
  materia?: number | null;
}
