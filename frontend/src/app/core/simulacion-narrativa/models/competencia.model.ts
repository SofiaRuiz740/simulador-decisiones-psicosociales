/**
 * Indicadores ocultos de competencia clínica (0–100).
 * No se exponen a la UI durante la simulación.
 */
export type CompetenciaClinica =
  | 'empatia_clinica'
  | 'pensamiento_critico'
  | 'evaluacion_riesgo'
  | 'capacidad_investigativa'
  | 'manejo_crisis'
  | 'comunicacion_terapeutica';

export type IndicadoresCompetencia = Record<CompetenciaClinica, number>;

export type ModificadoresCompetencia = Partial<Record<CompetenciaClinica, number>>;

export const COMPETENCIAS_INICIALES: IndicadoresCompetencia = {
  empatia_clinica: 50,
  pensamiento_critico: 50,
  evaluacion_riesgo: 50,
  capacidad_investigativa: 50,
  manejo_crisis: 50,
  comunicacion_terapeutica: 50,
};

const LIMITE_COMPETENCIA = 100;
const MINIMO_COMPETENCIA = 0;

export function aplicarModificadoresCompetencia(
  competencias: IndicadoresCompetencia,
  modificadores: ModificadoresCompetencia,
): IndicadoresCompetencia {
  const resultado = { ...competencias };

  for (const competencia of Object.keys(modificadores) as CompetenciaClinica[]) {
    const delta = modificadores[competencia];
    if (delta === undefined) continue;
    resultado[competencia] = Math.min(
      LIMITE_COMPETENCIA,
      Math.max(MINIMO_COMPETENCIA, resultado[competencia] + delta),
    );
  }

  return resultado;
}
