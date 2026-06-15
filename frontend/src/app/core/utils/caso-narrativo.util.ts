import { PracticaEstudianteActiva } from '../models/estudiante-session.model';

/** Catálogo de casos narrativos (escalable para futuras prácticas). */
export interface CasoNarrativoCatalogo {
  slug: string;
  tituloPractica: string;
  subtituloCaso: string;
  areaTematica: string;
  disponible: boolean;
}

export const CATALOGO_CASOS_NARRATIVOS: CasoNarrativoCatalogo[] = [
  {
    slug: 'violencia-intrafamiliar',
    tituloPractica: 'Violencia intrafamiliar',
    subtituloCaso: 'Hospital San Juan De Dios — urgencias',
    areaTematica: 'Crisis y protección',
    disponible: true,
  },
  {
    slug: 'acoso-escolar',
    tituloPractica: 'Acoso escolar',
    subtituloCaso: 'Institución educativa',
    areaTematica: 'Convivencia escolar',
    disponible: false,
  },
  {
    slug: 'consumo-sustancias',
    tituloPractica: 'Consumo de sustancias',
    subtituloCaso: 'Centro de atención',
    areaTematica: 'Salud mental',
    disponible: false,
  },
  {
    slug: 'riesgo-suicida',
    tituloPractica: 'Riesgo suicida',
    subtituloCaso: 'Servicios de urgencia',
    areaTematica: 'Intervención en crisis',
    disponible: false,
  },
  {
    slug: 'conflicto-comunitario',
    tituloPractica: 'Conflicto comunitario',
    subtituloCaso: 'Mediación local',
    areaTematica: 'Psicología comunitaria',
    disponible: false,
  },
];

// 999999 = PK fijo del "Caso por defecto" sembrado por el backend
// (ver backend/apps/casos/constants.py y seed_caso_narrativo), asociado
// a la simulación narrativa visual "Violencia intrafamiliar" y visible
// para cualquier docente. Es el ÚNICO caso que debe activar esta
// simulación visual completa: cualquier otro caso creado por un docente
// (aunque tenga un nombre parecido, ej. "Pelea de parejas — golpes
// físicos — caso piloto") usa la vista previa genérica de texto.
const MAPEO_CASO_BACKEND: Record<number, string> = {
  999999: 'violencia-intrafamiliar',
};

/** Quita acentos y normaliza para comparar nombres de forma flexible. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function resolverCasoNarrativoId(practica: PracticaEstudianteActiva): string {
  if (MAPEO_CASO_BACKEND[practica.caso_id]) {
    return MAPEO_CASO_BACKEND[practica.caso_id];
  }

  // El listado "Mis prácticas" del estudiante no siempre trae el `caso_id`
  // real (puede llegar en 0). En ese caso, resolvemos por nombre: solo el
  // caso base "Urgencia vital — violencia intrafamiliar" coincide con el
  // título "Violencia intrafamiliar" del catálogo; otros casos creados por
  // docentes (ej. "Pelea de parejas — golpes físicos — caso piloto") no
  // contienen esa frase y no activan la simulación visual.
  const nombre = normalizar(practica.caso_nombre ?? '');
  if (nombre) {
    const coincidencia = CATALOGO_CASOS_NARRATIVOS.find(
      (c) => c.disponible && nombre.includes(normalizar(c.tituloPractica)),
    );
    if (coincidencia) {
      return coincidencia.slug;
    }
  }

  return '';
}

export function obtenerCatalogoCaso(slug: string): CasoNarrativoCatalogo | undefined {
  return CATALOGO_CASOS_NARRATIVOS.find((c) => c.slug === slug);
}

export function subtituloCasoParaPractica(
  practica: PracticaEstudianteActiva,
  casoNarrativoId: string,
): string {
  return (
    obtenerCatalogoCaso(casoNarrativoId)?.subtituloCaso ??
    practica.caso_nombre
  );
}
