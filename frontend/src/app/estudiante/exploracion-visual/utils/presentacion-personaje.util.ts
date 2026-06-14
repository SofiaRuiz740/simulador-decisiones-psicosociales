import { Personaje } from '../../../core/simulacion-narrativa/models/personaje.model';
import { ETIQUETAS_ROL } from '../../libreta-psicologo/libreta-presentacion.util';

/** Representación visual fija de la entrevistadora (estudiante investigador). */
export const PSICOLOGA_ENTREVISTADORA = {
  rolVisual: 'psicologa',
  nombre: 'Psicóloga',
  rol: 'Investigadora clínica',
} as const;

const ETIQUETAS_ROL_VISUAL: Record<string, string> = {
  psicologa: 'Investigadora clínica',
  victima: 'Paciente (víctima)',
  'madre-victima': 'Madre de Lucía (abuela)',
  'hermano-familiar': 'Hermano',
  'medico-urgencias': 'Médico de urgencias',
  enfermera: 'Enfermera',
  policia: 'Funcionario policial',
  'trabajadora-social': 'Trabajadora social',
  comisario: 'Comisario',
};

export function nombrePersonajeVisible(
  personajeId: string | null | undefined,
  personajes: Record<string, Personaje> | undefined,
): string {
  if (!personajeId || !personajes?.[personajeId]) return 'Personaje';
  return personajes[personajeId].nombre;
}

export function rolPersonajeVisible(
  personajeId: string | null | undefined,
  rolVisual: string | undefined,
  personajes: Record<string, Personaje> | undefined,
): string {
  if (rolVisual && ETIQUETAS_ROL_VISUAL[rolVisual]) {
    return ETIQUETAS_ROL_VISUAL[rolVisual];
  }

  if (rolVisual) {
    return rolVisual
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const personaje = personajeId ? personajes?.[personajeId] : undefined;
  if (personaje?.rol) {
    return ETIQUETAS_ROL[personaje.rol];
  }

  return '';
}

const ETIQUETAS_INTERACCION_POR_ROL: Record<string, string> = {
  victima: 'Paciente en UCI',
  'madre-victima': 'Madre de Lucía',
  'hermano-familiar': 'Hermano',
  enfermera: 'Enfermera jefe',
  'medico-urgencias': 'Médico tratante',
  policia: 'Funcionario policial',
  'trabajadora-social': 'Trabajadora social',
  comisario: 'Comisario',
};

/** Etiqueta breve para tooltip de personaje integrado en escena. */
export function etiquetaInteraccionPersonaje(
  personajeId: string,
  rolVisual: string | undefined,
  personajes: Record<string, Personaje> | undefined,
  etiquetaExplicita?: string,
): string {
  if (etiquetaExplicita?.trim()) {
    return etiquetaExplicita.trim();
  }

  if (rolVisual && ETIQUETAS_INTERACCION_POR_ROL[rolVisual]) {
    return ETIQUETAS_INTERACCION_POR_ROL[rolVisual];
  }

  const nombre = nombrePersonajeVisible(personajeId, personajes);
  const rol = rolPersonajeVisible(personajeId, rolVisual, personajes);
  return rol ? `${nombre} · ${rol}` : nombre;
}
