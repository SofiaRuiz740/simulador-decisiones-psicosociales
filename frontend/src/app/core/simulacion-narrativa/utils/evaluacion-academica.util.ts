import { EstadoPartida } from '../models/estado-partida.model';
import { EstrategiaClinica } from '../models/estrategia-clinica.model';
import { ResumenPedagogico } from '../models/trazabilidad.model';

export interface CompetenciaEvaluada {
  id: string;
  etiqueta: string;
  fortalecida: boolean;
  detalle: string;
}

function usoEstrategia(
  resumen: ResumenPedagogico,
  estrategia: EstrategiaClinica,
): boolean {
  return (resumen.estrategiasUtilizadas[estrategia] ?? 0) > 0;
}

function flag(estado: EstadoPartida, clave: string): boolean {
  return !!estado.flags[clave];
}

/**
 * Deriva competencias académicas visibles al cierre sin alterar el sistema de puntuación.
 * Combina flags de criterio (opciones clínicas) con estrategias registradas en trazabilidad.
 */
export function evaluarCompetenciasFinales(
  estado: EstadoPartida,
  resumen: ResumenPedagogico,
): CompetenciaEvaluada[] {
  const escucha =
    usoEstrategia(resumen, 'escucha_activa') || flag(estado, 'criterio_escucha_activa');

  const valoracionRiesgo =
    usoEstrategia(resumen, 'evaluacion_riesgo') ||
    flag(estado, 'criterio_riesgo_feminicidio') ||
    flag(estado, 'criterio_factores_riesgo');

  const factoresProtectores = flag(estado, 'criterio_factores_protectores');

  const factoresRiesgo =
    flag(estado, 'criterio_factores_riesgo') ||
    flag(estado, 'criterio_ciclo_violencia') ||
    flag(estado, 'criterio_senales_previas');

  const trabajoInterdisciplinario =
    flag(estado, 'criterio_derivacion_interdisciplinaria') ||
    (estado.conversacionesCompletadas.includes('entrevista-comisario') &&
      estado.conversacionesCompletadas.includes('entrevista-trabajadora-social-comisaria'));

  const activacionRutas =
    usoEstrategia(resumen, 'planificacion_seguridad') ||
    flag(estado, 'criterio_rutas_institucionales') ||
    flag(estado, 'criterio_medidas_proteccion');

  const decisionEtica =
    flag(estado, 'criterio_decision_etica') ||
    (usoEstrategia(resumen, 'validacion_emocional') &&
      !flag(estado, 'criterio_confrontacion_imprudente'));

  return [
    {
      id: 'escucha_activa',
      etiqueta: 'Escucha activa',
      fortalecida: escucha,
      detalle: escucha
        ? 'Sostuvo presencia y escucha sin juicios antes de indagar.'
        : 'Fortalezca la escucha activa antes de formular preguntas sensibles.',
    },
    {
      id: 'valoracion_riesgo',
      etiqueta: 'Valoración de riesgo',
      fortalecida: valoracionRiesgo,
      detalle: valoracionRiesgo
        ? 'Exploró riesgo actual y factores de peligro en el caso.'
        : 'Priorice valorar el riesgo psicosocial y de feminicidio de forma explícita.',
    },
    {
      id: 'factores_protectores',
      etiqueta: 'Identificación de factores protectores',
      fortalecida: factoresProtectores,
      detalle: factoresProtectores
        ? 'Indagó redes de apoyo y recursos que pueden sostener a la familia.'
        : 'Explore quién acompaña a la víctima y qué recursos familiares existen.',
    },
    {
      id: 'factores_riesgo',
      etiqueta: 'Identificación de factores de riesgo',
      fortalecida: factoresRiesgo,
      detalle: factoresRiesgo
        ? 'Reconstruyó antecedentes, escalamiento o señales previas de violencia.'
        : 'Profundice en antecedentes, frecuencia y escalamiento de la violencia.',
    },
    {
      id: 'trabajo_interdisciplinario',
      etiqueta: 'Trabajo interdisciplinario',
      fortalecida: trabajoInterdisciplinario,
      detalle: trabajoInterdisciplinario
        ? 'Articuló hallazgos clínicos con equipos médico, social y policial.'
        : 'Coordine derivaciones y síntesis con otros profesionales del caso.',
    },
    {
      id: 'activacion_rutas',
      etiqueta: 'Activación de rutas',
      fortalecida: activacionRutas,
      detalle: activacionRutas
        ? 'Impulsó medidas de protección y rutas institucionales pertinentes.'
        : 'Active protocolos y medidas de protección cuando el riesgo lo exige.',
    },
    {
      id: 'decision_etica',
      etiqueta: 'Toma de decisiones éticas',
      fortalecida: decisionEtica,
      detalle: decisionEtica
        ? 'Priorizó contención, verdad clínica y protección sobre presión investigativa.'
        : 'Revise decisiones que equilibren verdad, protección y no revictimización.',
    },
  ];
}
