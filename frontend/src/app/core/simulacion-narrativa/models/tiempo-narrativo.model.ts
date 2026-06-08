export interface TiempoNarrativo {
  dia: number;
  hora: number;
  minuto: number;
  /** Etiqueta legible opcional, p. ej. "Día 2 — 00:45". */
  etiqueta?: string;
}

export interface ConfigTiempoNarrativo {
  inicio: TiempoNarrativo;
  /** Minutos que avanza el tiempo tras cada acción significativa del estudiante. */
  minutosPorAccion?: number;
}

export function crearTiempoNarrativo(parcial?: Partial<TiempoNarrativo>): TiempoNarrativo {
  return {
    dia: parcial?.dia ?? 1,
    hora: parcial?.hora ?? 0,
    minuto: parcial?.minuto ?? 0,
    etiqueta: parcial?.etiqueta,
  };
}

export function formatearTiempoNarrativo(tiempo: TiempoNarrativo): string {
  if (tiempo.etiqueta) return tiempo.etiqueta;
  const hh = String(tiempo.hora).padStart(2, '0');
  const mm = String(tiempo.minuto).padStart(2, '0');
  return tiempo.dia > 1 ? `Día ${tiempo.dia} — ${hh}:${mm}` : `${hh}:${mm}`;
}

export function tiempoNarrativoAMinutos(tiempo: TiempoNarrativo): number {
  return (tiempo.dia - 1) * 24 * 60 + tiempo.hora * 60 + tiempo.minuto;
}

export function minutosATiempoNarrativo(totalMinutos: number): TiempoNarrativo {
  const dia = Math.floor(totalMinutos / (24 * 60)) + 1;
  const resto = totalMinutos % (24 * 60);
  const hora = Math.floor(resto / 60);
  const minuto = resto % 60;
  return { dia, hora, minuto };
}

export function avanzarTiempoNarrativo(
  tiempo: TiempoNarrativo,
  minutos: number,
): TiempoNarrativo {
  const total = tiempoNarrativoAMinutos(tiempo) + minutos;
  return minutosATiempoNarrativo(total);
}

export function compararTiempoNarrativo(a: TiempoNarrativo, b: TiempoNarrativo): number {
  return tiempoNarrativoAMinutos(a) - tiempoNarrativoAMinutos(b);
}
