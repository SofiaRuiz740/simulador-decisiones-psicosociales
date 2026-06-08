import { MetricaPersonaje, MetricasPersonaje, aplicarModificadoresMetricas } from '../models/metricas-personaje.model';
import { Personaje } from '../models/personaje.model';
import { EstadoPartida } from '../models/estado-partida.model';
import { crearMetricasPersonaje } from '../models/metricas-personaje.model';

export function inicializarMetricasPersonajes(
  estado: EstadoPartida,
  personajes: Personaje[],
): void {
  for (const personaje of personajes) {
    estado.metricasPersonajes[personaje.id] = crearMetricasPersonaje(
      personaje.metricasIniciales,
    );
    estado.conversacionesUtilesPorPersonaje[personaje.id] = 0;
  }
}

export function obtenerMetricasPersonaje(
  estado: EstadoPartida,
  personajeId: string,
): MetricasPersonaje | undefined {
  return estado.metricasPersonajes[personajeId];
}

export function modificarMetricaPersonaje(
  estado: EstadoPartida,
  personajeId: string,
  metrica: MetricaPersonaje,
  delta: number,
): void {
  const actuales = estado.metricasPersonajes[personajeId];
  if (!actuales) return;

  estado.metricasPersonajes[personajeId] = aplicarModificadoresMetricas(actuales, {
    [metrica]: delta,
  });
}

export function modificarMetricasPersonaje(
  estado: EstadoPartida,
  personajeId: string,
  modificadores: Partial<Record<MetricaPersonaje, number>>,
): void {
  const actuales = estado.metricasPersonajes[personajeId];
  if (!actuales) return;

  estado.metricasPersonajes[personajeId] = aplicarModificadoresMetricas(
    actuales,
    modificadores,
  );
}

export function cumpleMetricaMinima(
  estado: EstadoPartida,
  personajeId: string,
  metrica: MetricaPersonaje,
  valorMinimo: number,
): boolean {
  const metricas = estado.metricasPersonajes[personajeId];
  if (!metricas) return false;
  return metricas[metrica] >= valorMinimo;
}
