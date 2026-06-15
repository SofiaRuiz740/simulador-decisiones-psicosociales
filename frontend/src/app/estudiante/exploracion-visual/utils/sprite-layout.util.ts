import { PosicionEscena } from '../models/escena-visual.model';

/** Zona segura de colocación coherente con el suelo del escenario ilustrado. */
export interface ZonaColocacionSprite {
  id: string;
  /** Centro horizontal recomendado (%). */
  x: number;
  /** Altura de los pies (% desde arriba del escenario). */
  piesY: number;
  xMin: number;
  xMax: number;
  piesYMin?: number;
  piesYMax?: number;
}

/** Límites del área visible donde puede renderizarse un sprite. */
export interface LimitesEscena {
  /** Techo útil: la cabeza no puede quedar por encima (%). */
  margenSuperior: number;
  /** Margen lateral mínimo para el ancho del sprite (%). */
  margenLateral: number;
  /** Pies mínimos (%): evita flotar demasiado arriba. */
  piesYMin: number;
  /** Pies máximos (%): evita salir por el borde inferior. */
  piesYMax: number;
}

/** Área de mobiliario / pared donde no puede colocarse un sprite. */
export interface AreaProhibida {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** Compensación visual por escenario ilustrado (capa de presentación). */
export interface PerfilVisualEscena {
  lineaSueloY: number;
  factorEscala: number;
  limites: LimitesEscena;
  zonas: ZonaColocacionSprite[];
  /** Mobiliario, camas, mostradores y paredes — sprites nunca se anclan aquí. */
  areasProhibidas?: AreaProhibida[];
}

export interface PosicionSpriteResuelta {
  x: number;
  piesY: number;
  factorEscala: number;
  zIndex: number;
}

export interface BoundingBoxSpritePct {
  izquierda: number;
  derecha: number;
  arriba: number;
  abajo: number;
}

const LIMITES_DEFAULT: LimitesEscena = {
  margenSuperior: 12,
  margenLateral: 8,
  piesYMin: 78,
  piesYMax: 93,
};

const PERFIL_DEFAULT: PerfilVisualEscena = {
  lineaSueloY: 85,
  factorEscala: 1.45,
  limites: LIMITES_DEFAULT,
  zonas: [],
};

/** Perfiles calibrados para fondos ilustrados (1536×1024, cover). */
export const PERFILES_VISUALES_ESCENA: Record<string, PerfilVisualEscena> = {
  entrada: {
    lineaSueloY: 88,
    factorEscala: 1.35,
    limites: { margenSuperior: 14, margenLateral: 10, piesYMin: 82, piesYMax: 94 },
    zonas: [
      { id: 'acera-izq', x: 22, piesY: 88, xMin: 14, xMax: 30 },
      { id: 'entrada', x: 48, piesY: 87, xMin: 38, xMax: 56 },
      { id: 'acera-der', x: 68, piesY: 88, xMin: 58, xMax: 78 },
    ],
  },
  'sala-espera': {
    lineaSueloY: 86,
    factorEscala: 1.62,
    limites: { margenSuperior: 12, margenLateral: 9, piesYMin: 83, piesYMax: 92 },
    areasProhibidas: [
      { xMin: 6, xMax: 18, yMin: 55, yMax: 95 },
      { xMin: 28, xMax: 42, yMin: 68, yMax: 95 },
      { xMin: 44, xMax: 56, yMin: 68, yMax: 95 },
      { xMin: 58, xMax: 72, yMin: 68, yMax: 95 },
      { xMin: 84, xMax: 96, yMin: 40, yMax: 95 },
    ],
    zonas: [
      {
        id: 'frente-recepcion',
        x: 22,
        piesY: 86,
        xMin: 17,
        xMax: 28,
        piesYMin: 84,
        piesYMax: 90,
      },
      {
        id: 'transito-izquierdo',
        x: 30,
        piesY: 87,
        xMin: 28,
        xMax: 32,
        piesYMin: 85,
        piesYMax: 91,
      },
      {
        id: 'transito-central',
        x: 50,
        piesY: 87,
        xMin: 47,
        xMax: 55,
        piesYMin: 85,
        piesYMax: 91,
      },
      {
        id: 'transito-derecho',
        x: 76,
        piesY: 86,
        xMin: 74,
        xMax: 82,
        piesYMin: 84,
        piesYMax: 90,
      },
    ],
  },
  'pasillo-urgencias': {
    lineaSueloY: 85,
    factorEscala: 1.58,
    limites: { margenSuperior: 12, margenLateral: 9, piesYMin: 82, piesYMax: 92 },
    areasProhibidas: [
      { xMin: 54, xMax: 78, yMin: 55, yMax: 88 },
    ],
    zonas: [
      {
        id: 'pasillo-izquierdo',
        x: 24,
        piesY: 85,
        xMin: 18,
        xMax: 32,
        piesYMin: 83,
        piesYMax: 89,
      },
      {
        id: 'centro-pasillo',
        x: 40,
        piesY: 85,
        xMin: 34,
        xMax: 48,
        piesYMin: 83,
        piesYMax: 89,
      },
    ],
  },
  'estacion-medica': {
    lineaSueloY: 86,
    factorEscala: 1.55,
    limites: { margenSuperior: 12, margenLateral: 9, piesYMin: 83, piesYMax: 92 },
    zonas: [
      { id: 'mostrador', x: 36, piesY: 86, xMin: 28, xMax: 44 },
      { id: 'archivo', x: 54, piesY: 86, xMin: 46, xMax: 62 },
    ],
  },
  'cuidados-intensivos': {
    lineaSueloY: 84,
    factorEscala: 1.52,
    limites: { margenSuperior: 10, margenLateral: 10, piesYMin: 81, piesYMax: 90 },
    areasProhibidas: [
      { xMin: 38, xMax: 66, yMin: 52, yMax: 86 },
      { xMin: 62, xMax: 86, yMin: 42, yMax: 78 },
      { xMin: 14, xMax: 28, yMin: 48, yMax: 72 },
    ],
    zonas: [
      {
        id: 'lateral-monitores',
        x: 34,
        piesY: 84,
        xMin: 28,
        xMax: 40,
        piesYMin: 82,
        piesYMax: 88,
      },
      {
        id: 'pie-cama-paciente',
        x: 44,
        piesY: 83,
        xMin: 40,
        xMax: 48,
        piesYMin: 81,
        piesYMax: 87,
      },
      {
        id: 'medico-monitores',
        x: 58,
        piesY: 84,
        xMin: 52,
        xMax: 64,
        piesYMin: 82,
        piesYMax: 88,
      },
    ],
  },
  /** Perfil reservado para escenarios policiales futuros. */
  comisaria: {
    lineaSueloY: 86,
    factorEscala: 1.5,
    limites: { margenSuperior: 12, margenLateral: 9, piesYMin: 83, piesYMax: 92 },
    zonas: [
      { id: 'escritorio-atencion', x: 32, piesY: 86, xMin: 24, xMax: 40 },
      { id: 'frente-oficina', x: 50, piesY: 86, xMin: 42, xMax: 58 },
      { id: 'area-espera', x: 68, piesY: 87, xMin: 60, xMax: 76 },
    ],
  },
};

export function obtenerPerfilVisualEscena(escenaId: string): PerfilVisualEscena {
  if (escenaId === 'exterior-comisaria' || escenaId === 'interior-comisaria') {
    return PERFILES_VISUALES_ESCENA['comisaria'];
  }
  return PERFILES_VISUALES_ESCENA[escenaId] ?? PERFIL_DEFAULT;
}

/** Altura visible del sprite — se conserva la escala actual. */
export function alturaSpriteCss(esPrincipal: boolean, factorEscala: number): string {
  if (esPrincipal) {
    return `clamp(180px, ${26 * factorEscala}vh, 260px)`;
  }
  return `clamp(170px, ${24 * factorEscala}vh, 240px)`;
}

/** Estima altura y medio-ancho del sprite como % del escenario (100vh). */
export function estimarDimensionesSpritePct(
  esPrincipal: boolean,
  factorEscala: number,
  escalaExtra = 1,
): { altoPct: number; medioAnchoPct: number } {
  const altoVh = (esPrincipal ? 26 : 24) * factorEscala * escalaExtra;
  const altoPct = Math.min(esPrincipal ? 42 : 40, altoVh);
  const medioAnchoPct = Math.min(12, altoPct * 0.28);
  return { altoPct, medioAnchoPct };
}

export function estimarBoundingBoxSprite(
  x: number,
  piesY: number,
  esPrincipal: boolean,
  factorEscala: number,
  escalaExtra = 1,
): BoundingBoxSpritePct {
  const { altoPct, medioAnchoPct } = estimarDimensionesSpritePct(
    esPrincipal,
    factorEscala,
    escalaExtra,
  );

  return {
    izquierda: x - medioAnchoPct,
    derecha: x + medioAnchoPct,
    arriba: piesY - altoPct,
    abajo: piesY,
  };
}

export function bboxDentroDeLimites(
  bbox: BoundingBoxSpritePct,
  limites: LimitesEscena,
): boolean {
  return (
    bbox.izquierda >= limites.margenLateral &&
    bbox.derecha <= 100 - limites.margenLateral &&
    bbox.arriba >= limites.margenSuperior &&
    bbox.abajo <= limites.piesYMax &&
    bbox.abajo >= limites.piesYMin
  );
}

/**
 * Ajusta x/piesY para que el bounding box quede dentro del escenario.
 * Prioriza mantener los pies en el suelo y la escala intacta.
 */
export function ajustarPosicionAlLimites(
  x: number,
  piesY: number,
  esPrincipal: boolean,
  factorEscala: number,
  limites: LimitesEscena,
  escalaExtra = 1,
): { x: number; piesY: number } {
  const { altoPct, medioAnchoPct } = estimarDimensionesSpritePct(
    esPrincipal,
    factorEscala,
    escalaExtra,
  );

  let xAjustado = x;
  let piesYAjustado = piesY;

  const xMin = limites.margenLateral + medioAnchoPct;
  const xMax = 100 - limites.margenLateral - medioAnchoPct;
  xAjustado = clamp(xAjustado, xMin, xMax);

  piesYAjustado = clamp(piesYAjustado, limites.piesYMin, limites.piesYMax);

  let arriba = piesYAjustado - altoPct;
  if (arriba < limites.margenSuperior) {
    piesYAjustado = limites.margenSuperior + altoPct;
    piesYAjustado = Math.min(piesYAjustado, limites.piesYMax);
  }

  if (piesYAjustado > limites.piesYMax) {
    piesYAjustado = limites.piesYMax;
  }

  const bbox = estimarBoundingBoxSprite(
    xAjustado,
    piesYAjustado,
    esPrincipal,
    factorEscala,
    escalaExtra,
  );

  if (bbox.derecha > 100 - limites.margenLateral) {
    xAjustado = 100 - limites.margenLateral - medioAnchoPct;
  }
  if (bbox.izquierda < limites.margenLateral) {
    xAjustado = limites.margenLateral + medioAnchoPct;
  }

  return { x: xAjustado, piesY: piesYAjustado };
}

function bboxIntersectaProhibido(
  bbox: BoundingBoxSpritePct,
  areas: AreaProhibida[],
): boolean {
  return areas.some(
    (area) =>
      bbox.izquierda < area.xMax &&
      bbox.derecha > area.xMin &&
      bbox.arriba < area.yMax &&
      bbox.abajo > area.yMin,
  );
}

function evitarAreasProhibidas(
  x: number,
  piesY: number,
  esPrincipal: boolean,
  factorEscala: number,
  perfil: PerfilVisualEscena,
  escalaExtra: number,
): { x: number; piesY: number } {
  const areas = perfil.areasProhibidas ?? [];
  if (!areas.length || !perfil.zonas.length) {
    return { x, piesY };
  }

  let candidata = { x, piesY };
  let bbox = estimarBoundingBoxSprite(
    candidata.x,
    candidata.piesY,
    esPrincipal,
    factorEscala,
    escalaExtra,
  );

  if (!bboxIntersectaProhibido(bbox, areas)) {
    return candidata;
  }

  const alternativas = perfil.zonas.map((zona) => ({
    x: zona.x,
    piesY: clamp(
      zona.piesY,
      zona.piesYMin ?? perfil.limites.piesYMin,
      zona.piesYMax ?? perfil.limites.piesYMax,
    ),
  }));

  for (const alt of alternativas) {
    bbox = estimarBoundingBoxSprite(alt.x, alt.piesY, esPrincipal, factorEscala, escalaExtra);
    if (!bboxIntersectaProhibido(bbox, areas)) {
      return alt;
    }
  }

  return candidata;
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

function encontrarZona(
  zonas: ZonaColocacionSprite[],
  x: number,
): ZonaColocacionSprite | null {
  const contenida = zonas.find((zona) => x >= zona.xMin && x <= zona.xMax);
  if (contenida) return contenida;

  if (!zonas.length) return null;

  return zonas.reduce((mejor, zona) => {
    const distActual = Math.abs(x - zona.x);
    const distMejor = Math.abs(x - mejor.x);
    return distActual < distMejor ? zona : mejor;
  });
}

function aplicarZonaSegura(
  posicion: PosicionEscena,
  zona: ZonaColocacionSprite | null,
  perfil: PerfilVisualEscena,
): { x: number; piesY: number } {
  const piesLegacy = posicion.y < 70;
  const piesSolicitado = piesLegacy ? perfil.lineaSueloY : posicion.y;

  if (!zona) {
    return {
      x: posicion.x,
      piesY: Math.max(piesSolicitado, perfil.lineaSueloY),
    };
  }

  const piesY = clamp(
    zona.piesY,
    zona.piesYMin ?? perfil.limites.piesYMin,
    zona.piesYMax ?? perfil.limites.piesYMax,
  );

  return {
    x: clamp(posicion.x, zona.xMin, zona.xMax),
    piesY: Math.max(piesY, piesSolicitado),
  };
}

/**
 * Resuelve posición con anclaje en los pies, snap a zona segura y validación de bbox.
 */
export function resolverPosicionSprite(
  posicion: PosicionEscena,
  escenaId: string,
  esPrincipal = false,
  escalaExtra = 1,
): PosicionSpriteResuelta {
  const perfil = obtenerPerfilVisualEscena(escenaId);
  const zona = encontrarZona(perfil.zonas, posicion.x);
  const candidata = aplicarZonaSegura(posicion, zona, perfil);

  let { x, piesY } = candidata;

  if (zona) {
    x = zona.x;
    piesY = clamp(
      zona.piesY,
      zona.piesYMin ?? perfil.limites.piesYMin,
      zona.piesYMax ?? perfil.limites.piesYMax,
    );
  }

  const ajustada = ajustarPosicionAlLimites(
    x,
    piesY,
    esPrincipal,
    perfil.factorEscala,
    perfil.limites,
    escalaExtra,
  );

  const sinMobiliario = evitarAreasProhibidas(
    ajustada.x,
    ajustada.piesY,
    esPrincipal,
    perfil.factorEscala,
    perfil,
    escalaExtra,
  );

  return {
    x: sinMobiliario.x,
    piesY: sinMobiliario.piesY,
    factorEscala: perfil.factorEscala,
    zIndex: Math.round(sinMobiliario.piesY),
  };
}

/** @deprecated Personajes integrados en escenarios; usar hotspots invisibles. */
export function posicionSpriteCss(
  posicion: PosicionEscena,
  escenaId: string,
  esPrincipal = false,
  escalaExtra = 1,
): Record<string, string> {
  const resuelta = resolverPosicionSprite(posicion, escenaId, esPrincipal, escalaExtra);
  const altura = alturaSpriteCss(esPrincipal, resuelta.factorEscala);
  const bbox = estimarBoundingBoxSprite(
    resuelta.x,
    resuelta.piesY,
    esPrincipal,
    resuelta.factorEscala,
    escalaExtra,
  );

  return {
    left: `${resuelta.x}%`,
    bottom: `${100 - resuelta.piesY}%`,
    top: 'auto',
    width: 'auto',
    height: 'auto',
    zIndex: String(resuelta.zIndex),
    '--sprite-altura': altura,
    '--sprite-escala-extra': String(escalaExtra),
    '--sprite-pies-y': `${resuelta.piesY}%`,
    '--sprite-bbox-top': `${bbox.arriba}%`,
  };
}

export function variablesCssEscena(escenaId: string): Record<string, string> {
  const perfil = obtenerPerfilVisualEscena(escenaId);
  return {
    '--escena-linea-suelo': `${perfil.lineaSueloY}%`,
    '--escena-factor-escala': String(perfil.factorEscala),
    '--escena-margen-lateral': `${perfil.limites.margenLateral}%`,
  };
}

/** Expuesto para pruebas y depuración visual. */
export function validarSpriteVisible(
  posicion: PosicionEscena,
  escenaId: string,
  esPrincipal = false,
  escalaExtra = 1,
): boolean {
  const perfil = obtenerPerfilVisualEscena(escenaId);
  const resuelta = resolverPosicionSprite(posicion, escenaId, esPrincipal, escalaExtra);
  const bbox = estimarBoundingBoxSprite(
    resuelta.x,
    resuelta.piesY,
    esPrincipal,
    perfil.factorEscala,
    escalaExtra,
  );
  return bboxDentroDeLimites(bbox, perfil.limites);
}
