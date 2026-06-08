import { environment } from '../../../../environments/environment';

const STORAGE_PREFIX = 'narrativa-intro-vista';

export function claveIntroVista(
  casoId: string,
  estudianteId?: string | number | null,
): string {
  const base = `${STORAGE_PREFIX}:${casoId}`;
  if (estudianteId === undefined || estudianteId === null || estudianteId === '') {
    return base;
  }
  return `${base}:${estudianteId}`;
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
): boolean {
  if (typeof localStorage === 'undefined') return false;

  const clave = claveIntroVista(casoId, estudianteId);
  const valor = localStorage.getItem(clave);
  const vista = valor === '1';

  logIntro('Lectura de clave intro', {
    clave,
    valorLeido: valor,
    estudianteId: estudianteId ?? null,
    introduccionYaVista: vista,
  });

  return vista;
}

export function marcarIntroduccionVista(
  casoId: string,
  estudianteId?: string | number | null,
): void {
  if (typeof localStorage === 'undefined') return;

  const clave = claveIntroVista(casoId, estudianteId);
  localStorage.setItem(clave, '1');

  logIntro('Intro marcada como vista (fin de secuencia)', {
    clave,
    valorEscrito: '1',
    estudianteId: estudianteId ?? null,
    momento: new Date().toISOString(),
  });
}

export function resolverFaseIntro(
  casoId: string,
  estudianteId?: string | number | null,
): 'intro' | 'simulacion' {
  const vista = introduccionYaVista(casoId, estudianteId);
  const fase = vista ? 'simulacion' : 'intro';

  logIntro('Decisión de fase al entrar al caso', {
    casoId,
    estudianteId: estudianteId ?? null,
    clave: claveIntroVista(casoId, estudianteId),
    faseElegida: fase,
  });

  return fase;
}

/** Duración del crossfade entre imágenes (ms). */
export const DURACION_CROSSFADE_MS = 700;
