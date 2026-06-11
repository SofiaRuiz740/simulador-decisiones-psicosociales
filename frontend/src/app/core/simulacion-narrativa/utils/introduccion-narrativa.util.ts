import { environment } from '../../../../environments/environment';
import {
  clavePartidaPersistida,
  leerPartidaPersistida,
} from './partida-persistencia.util';

const STORAGE_PREFIX = 'narrativa-intro-vista';

export function claveIntroVista(
  casoId: string,
  estudianteId?: string | number | null,
  practicaId?: number | null,
): string {
  let base = `${STORAGE_PREFIX}:${casoId}`;
  if (estudianteId === undefined || estudianteId === null || estudianteId === '') {
    return base;
  }
  base += `:${estudianteId}`;
  if (practicaId !== undefined && practicaId !== null) {
    base += `:${practicaId}`;
  }
  return base;
}

/** Claves de intro que pueden quedar tras migraciones o reinicios parciales. */
export function clavesIntroRelacionadas(
  casoId: string,
  estudianteId?: string | number | null,
  practicaId?: number | null,
): string[] {
  const claves = new Set<string>();
  claves.add(claveIntroVista(casoId));
  claves.add(claveIntroVista(casoId, estudianteId));
  if (practicaId != null) {
    claves.add(claveIntroVista(casoId, estudianteId, practicaId));
  }
  return [...claves];
}

function logIntro(mensaje: string, datos?: Record<string, unknown>): void {
  if (environment.production) return;
  if (datos) {
    console.info(`[IntroNarrativa] ${mensaje}`, datos);
    return;
  }
  console.info(`[IntroNarrativa] ${mensaje}`);
}

export function introduccionYaVista(
  casoId: string,
  estudianteId?: string | number | null,
  practicaId?: number | null,
): boolean {
  if (typeof localStorage === 'undefined') return false;

  const claves = practicaId != null
    ? [claveIntroVista(casoId, estudianteId, practicaId), claveIntroVista(casoId, estudianteId)]
    : [claveIntroVista(casoId, estudianteId), claveIntroVista(casoId)];

  for (const clave of claves) {
    if (localStorage.getItem(clave) === '1') {
      logIntro('Lectura de clave intro', {
        clave,
        valorLeido: '1',
        estudianteId: estudianteId ?? null,
        practicaId: practicaId ?? null,
        introduccionYaVista: true,
      });
      return true;
    }
  }

  logIntro('Lectura de clave intro', {
    clavesConsultadas: claves,
    estudianteId: estudianteId ?? null,
    practicaId: practicaId ?? null,
    introduccionYaVista: false,
  });
  return false;
}

export function marcarIntroduccionVista(
  casoId: string,
  estudianteId?: string | number | null,
  practicaId?: number | null,
): void {
  if (typeof localStorage === 'undefined') return;

  const clave = claveIntroVista(casoId, estudianteId, practicaId);
  localStorage.setItem(clave, '1');

  logIntro('Intro marcada como vista (fin de secuencia)', {
    clave,
    valorEscrito: '1',
    estudianteId: estudianteId ?? null,
    practicaId: practicaId ?? null,
    momento: new Date().toISOString(),
  });
}

export interface OpcionesFaseIntro {
  /** Si false, indica reinicio (partida ausente antes de cargar el motor). */
  partidaPreexistente?: boolean;
}

function existePartidaPersistida(
  casoId: string,
  estudianteId: number | null,
  practicaId: number | null,
): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (estudianteId == null) return false;

  const clave = clavePartidaPersistida({ casoId, estudianteId, practicaId });
  return leerPartidaPersistida(clave) != null;
}

/**
 * Decide si mostrar intro o simulación.
 * Tras reinicio de práctica (partida borrada) vuelve a intro aunque la clave intro siga en '1'.
 * Debe evaluarse ANTES de que el motor persista una partida nueva.
 */
export function resolverFaseIntro(
  casoId: string,
  estudianteId?: string | number | null,
  practicaId?: number | null,
  opciones?: OpcionesFaseIntro,
): 'intro' | 'simulacion' {
  const vista = introduccionYaVista(casoId, estudianteId, practicaId);

  if (!vista) {
    logIntro('Decisión de fase al entrar al caso', {
      casoId,
      estudianteId: estudianteId ?? null,
      practicaId: practicaId ?? null,
      faseElegida: 'intro',
      motivo: 'intro_no_vista',
    });
    return 'intro';
  }

  if (practicaId != null && typeof estudianteId === 'number') {
    const hayPartida =
      opciones?.partidaPreexistente ??
      existePartidaPersistida(casoId, estudianteId, practicaId);
    if (!hayPartida) {
      logIntro('Decisión de fase al entrar al caso', {
        casoId,
        estudianteId,
        practicaId,
        clavePartida: clavePartidaPersistida({ casoId, estudianteId, practicaId }),
        faseElegida: 'intro',
        motivo: 'reinicio_practica_sin_partida',
      });
      return 'intro';
    }
  }

  logIntro('Decisión de fase al entrar al caso', {
    casoId,
    estudianteId: estudianteId ?? null,
    practicaId: practicaId ?? null,
    faseElegida: 'simulacion',
    motivo: 'intro_vista_y_partida_presente',
  });
  return 'simulacion';
}

/** Duración del crossfade entre imágenes (ms). */
export const DURACION_CROSSFADE_MS = 700;
