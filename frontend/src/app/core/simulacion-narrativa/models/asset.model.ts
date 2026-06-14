/** Escenarios lógicos de la exploración visual → archivo real en escenarios/. */
export type EscenarioId =
  | 'entrada'
  | 'sala-espera'
  | 'pasillo-urgencias'
  | 'estacion-medica'
  | 'cuidados-intensivos'
  | 'exterior-comisaria'
  | 'interior-comisaria';

/** Fondos exclusivos de la secuencia de introducción narrativa. */
export type IntroFondoId = 'intro-fondo-1' | 'intro-fondo-2' | 'intro-fondo-3';

/**
 * Roles clínicos interactivos — Hospital (urgencia vital y crisis).
 * Sin menores ni figuras vecinales como sprites.
 */
export type RolVisualId =
  | 'psicologa'
  | 'victima'
  | 'madre-victima'
  | 'hermano-familiar'
  | 'medico-urgencias'
  | 'enfermera'
  | 'policia'
  | 'trabajadora-social'
  | 'comisario';

/** Iconos de interfaz para hotspots y libreta. */
export type IconoId =
  | 'lupa'
  | 'libreta'
  | 'conversacion'
  | 'evidencia'
  | 'contradiccion'
  | 'hipotesis';

/** Expresiones faciales para retratos de diálogo (arquitectura futura). */
export type ExpresionRetrato = 'neutral' | 'triste' | 'angustiada' | 'confiada';

/** Referencia visual con prioridad de rolVisual sobre personajeId (legacy). */
export interface ReferenciaVisualPersonaje {
  rolVisual?: RolVisualId | string;
  personajeId?: string;
  /** Si existe, prevalece sobre mapeo global personajeId → rolVisual. */
  conversacionId?: string;
}

/**
 * Lucía comparte personajeId pero usa retratos distintos según el contexto clínico:
 * paciente en UCI (víctima) vs madre en sala de espera.
 */
export const ROL_VISUAL_POR_CONVERSACION: Partial<Record<string, RolVisualId>> = {
  'revisita-lucia-informe': 'victima',
  'revisita-lucia-tras-medico': 'victima',
  'revisita-madre-tras-ts': 'madre-victima',
  'entrevista-madre-espera': 'madre-victima',
};

/** Rutas relativas bajo /assets/simulacion-narrativa/ — nombres de archivo reales. */
export const ESCENARIOS_REGISTRADOS: Record<EscenarioId, string> = {
  entrada: 'escenarios/entrada.png',
  'sala-espera': 'escenarios/salaEsperaHospital.png',
  'pasillo-urgencias': 'escenarios/pasilloUrgencias.png',
  'estacion-medica': 'escenarios/estacionMedica.png',
  'cuidados-intensivos': 'escenarios/cuidadosIntensivos.png',
  'exterior-comisaria': 'escenarios/exteriorComisaria.png',
  'interior-comisaria': 'escenarios/interiorComisaria.png',
};

export const INTRO_FONDOS_REGISTRADOS: Record<IntroFondoId, string> = {
  'intro-fondo-1': 'escenarios/fondo1.png',
  'intro-fondo-2': 'escenarios/fondo2.png',
  'intro-fondo-3': 'escenarios/fondo3.png',
};

export const ROLES_VISUALES_REGISTRADOS: Record<RolVisualId, string> = {
  psicologa: 'personajes/psicologa-conversar.png',
  victima: 'personajes/victima-conversar.png',
  'madre-victima': 'personajes/madre-victima-conversar.png',
  'hermano-familiar': 'personajes/hermano-victima-conversar.png',
  'medico-urgencias': 'personajes/medico-urgencias-conversar.png',
  enfermera: 'personajes/enfermera-conversar.png',
  policia: 'personajes/policia.png',
  'trabajadora-social': 'personajes/trabajadoraSocial.png',
  comisario: 'personajes/comisario-conversar.png',
};

/**
 * Retratos recortados exclusivos para diálogos (variante *-conversar).
 * No usar en exploración: los NPCs están integrados en el arte del escenario.
 */
export const RETRATOS_CONVERSAR_REGISTRADOS: Record<RolVisualId, string> = {
  psicologa: 'personajes/psicologa-conversar.png',
  victima: 'personajes/victima-conversar.png',
  'madre-victima': 'personajes/madre-victima-conversar.png',
  'hermano-familiar': 'personajes/hermano-victima-conversar.png',
  'medico-urgencias': 'personajes/medico-urgencias-conversar.png',
  enfermera: 'personajes/enfermera-conversar.png',
  policia: 'personajes/policia.png',
  'trabajadora-social': 'personajes/trabajadoraSocial-conversar.png',
  comisario: 'personajes/comisario-conversar.png',
};

/** Si no hay variante *-conversar dedicada, retrato de diálogo = retrato base del rol. */
export const RETRATOS_CONVERSAR_FALLBACK: Partial<Record<RolVisualId, string>> = {
  policia: ROLES_VISUALES_REGISTRADOS.policia,
  'trabajadora-social': ROLES_VISUALES_REGISTRADOS['trabajadora-social'],
};

export const RETRATOS_NEUTRAL_REGISTRADOS: Partial<Record<RolVisualId, string>> =
  RETRATOS_CONVERSAR_REGISTRADOS;

export const RETRATOS_EXPRESION_REGISTRADOS: Partial<
  Record<RolVisualId, Partial<Record<ExpresionRetrato, string>>>
> = {};

/** Pista instrumental en loop para la simulación narrativa (MP3 recomendado, ≥ 2 min). */
export const AUDIO_AMBIENTE_REGISTRADO = 'audio/ambiente-hospital.mp3';

/** Pista opcional en comisaría; si no existe, se mantiene la pista hospital con modulación distinta. */
export const AUDIO_AMBIENTE_COMISARIA_REGISTRADO = 'audio/ambiente-comisaria.mp3';

/** Pista opcional durante la introducción; si no existe, se usa la pista hospital. */
export const AUDIO_AMBIENTE_INTRO_REGISTRADO = 'audio/ambiente-intro.mp3';

export const ICONOS_REGISTRADOS: Record<IconoId, string> = {
  lupa: 'iconos/lupa.svg',
  libreta: 'iconos/libreta.svg',
  conversacion: 'iconos/conversacion.svg',
  evidencia: 'iconos/evidencia.svg',
  contradiccion: 'iconos/contradiccion.svg',
  hipotesis: 'iconos/hipotesis.svg',
};

export const REGISTROS_ASSETS = {
  escenarios: ESCENARIOS_REGISTRADOS,
  introFondos: INTRO_FONDOS_REGISTRADOS,
  rolesVisuales: ROLES_VISUALES_REGISTRADOS,
  retratosConversar: RETRATOS_CONVERSAR_REGISTRADOS,
  retratosConversarFallback: RETRATOS_CONVERSAR_FALLBACK,
  retratosNeutral: RETRATOS_NEUTRAL_REGISTRADOS,
  retratosExpresion: RETRATOS_EXPRESION_REGISTRADOS,
  iconos: ICONOS_REGISTRADOS,
} as const;

export const BASE_ASSETS_SIMULACION = '/assets/simulacion-narrativa';

/** Roles clínicos excluidos del hospital: solo evidencia documental, nunca sprite. */
export const ROLES_SOLO_EVIDENCIA = [
  'menor-victima',
  'menor-fallecida',
  'vecina',
  'testigo-vecinal',
] as const;
