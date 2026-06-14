import { EstadoPartida } from '../models/estado-partida.model';

export const PARTIDA_STORAGE_PREFIX = 'narrativa-partida';
export const PARTIDA_PERSISTENCIA_VERSION = 1;

export interface ContextoPartidaPersistida {
  casoId: string;
  estudianteId: number | null;
  practicaId: number | null;
}

export interface PartidaPersistida {
  version: typeof PARTIDA_PERSISTENCIA_VERSION;
  estado: EstadoPartida;
  escenaVisualId: string | null;
  guardadoEn: string;
}

export function clavePartidaPersistida(ctx: ContextoPartidaPersistida): string {
  const estudiante = ctx.estudianteId ?? 'anon';
  const practica = ctx.practicaId ?? 'directo';
  return `${PARTIDA_STORAGE_PREFIX}:${ctx.casoId}:${estudiante}:${practica}`;
}

/** Omite estados efímeros de UI / diálogo activo. */
export function sanitizarEstadoParaPersistencia(estado: EstadoPartida): EstadoPartida {
  const copia = structuredClone(estado);
  copia.nodosConversacionActivos = {};
  copia.conversacionesEnFatiga = [];
  return copia;
}

export function leerPartidaPersistida(clave: string): PartidaPersistida | null {
  if (typeof localStorage === 'undefined') return null;

  const raw = localStorage.getItem(clave);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PartidaPersistida;
    if (parsed.version !== PARTIDA_PERSISTENCIA_VERSION) return null;
    if (!parsed.estado?.casoId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function escribirPartidaPersistida(clave: string, partida: PartidaPersistida): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(clave, JSON.stringify(partida));
}

export function borrarPartidaPersistida(ctx: ContextoPartidaPersistida): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(clavePartidaPersistida(ctx));
}

export function partidaPersistidaValidaParaCaso(
  partida: PartidaPersistida | null | undefined,
  casoId: string,
): partida is PartidaPersistida {
  return !!partida && partida.estado.casoId === casoId;
}

export function escenaVisualPersistidaValida(
  escenaVisualId: string | null | undefined,
  escenasIds: string[],
): string | null {
  if (!escenaVisualId) return null;
  return escenasIds.includes(escenaVisualId) ? escenaVisualId : null;
}
