/** Métricas psicosociales de relación clínica (0–100). */
export type MetricaPersonaje =
  | 'confianza'
  | 'ansiedad'
  | 'colaboracion'
  | 'aperturaEmocional';

export type MetricasPersonaje = Record<MetricaPersonaje, number>;

export type ModificadoresMetricas = Partial<Record<MetricaPersonaje, number>>;

export const METRICAS_PERSONAJE_DEFAULT: MetricasPersonaje = {
  confianza: 30,
  ansiedad: 60,
  colaboracion: 40,
  aperturaEmocional: 25,
};

export const LIMITE_METRICA = 100;
export const MINIMO_METRICA = 0;

export function crearMetricasPersonaje(
  iniciales?: Partial<MetricasPersonaje>,
): MetricasPersonaje {
  return {
    confianza: iniciales?.confianza ?? METRICAS_PERSONAJE_DEFAULT.confianza,
    ansiedad: iniciales?.ansiedad ?? METRICAS_PERSONAJE_DEFAULT.ansiedad,
    colaboracion: iniciales?.colaboracion ?? METRICAS_PERSONAJE_DEFAULT.colaboracion,
    aperturaEmocional:
      iniciales?.aperturaEmocional ?? METRICAS_PERSONAJE_DEFAULT.aperturaEmocional,
  };
}

export function aplicarModificadoresMetricas(
  metricas: MetricasPersonaje,
  modificadores: ModificadoresMetricas,
): MetricasPersonaje {
  const resultado = { ...metricas };

  for (const metrica of Object.keys(modificadores) as MetricaPersonaje[]) {
    const delta = modificadores[metrica];
    if (delta === undefined) continue;
    resultado[metrica] = Math.min(
      LIMITE_METRICA,
      Math.max(MINIMO_METRICA, resultado[metrica] + delta),
    );
  }

  return resultado;
}
