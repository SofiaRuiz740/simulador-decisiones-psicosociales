import {
  CasoNarrativoCompleto,
  EstrategiaClinica,
  PERFILES_ESTRATEGIA_CLINICA,
  PerfilEstrategiaClinica,
} from '../models';
import { ModificadoresMetricas } from '../models/metricas-personaje.model';
import { ModificadoresCompetencia } from '../models/competencia.model';

export function resolverPerfilEstrategia(
  caso: CasoNarrativoCompleto | null,
  estrategia: EstrategiaClinica,
): PerfilEstrategiaClinica {
  const base = PERFILES_ESTRATEGIA_CLINICA[estrategia];
  const override = caso?.manifest.perfilesEstrategia?.[estrategia];

  if (!override) return base;

  return {
    metricas: { ...base.metricas, ...override.metricas },
    competencias: { ...base.competencias, ...override.competencias },
  };
}

export function combinarModificadoresMetricas(
  base: ModificadoresMetricas | undefined,
  extra: ModificadoresMetricas | undefined,
): ModificadoresMetricas {
  const resultado: ModificadoresMetricas = { ...base };

  if (!extra) return resultado;

  for (const [clave, valor] of Object.entries(extra) as [keyof ModificadoresMetricas, number][]) {
    if (valor === undefined) continue;
    resultado[clave] = (resultado[clave] ?? 0) + valor;
  }

  return resultado;
}

export function combinarModificadoresCompetencia(
  base: ModificadoresCompetencia | undefined,
  extra: ModificadoresCompetencia | undefined,
): ModificadoresCompetencia {
  const resultado: ModificadoresCompetencia = { ...base };

  if (!extra) return resultado;

  for (const [clave, valor] of Object.entries(extra) as [keyof ModificadoresCompetencia, number][]) {
    if (valor === undefined) continue;
    resultado[clave] = (resultado[clave] ?? 0) + valor;
  }

  return resultado;
}
