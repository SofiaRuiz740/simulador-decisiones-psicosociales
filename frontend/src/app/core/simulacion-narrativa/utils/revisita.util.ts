import { CasoNarrativoCompleto, Conversacion, EstadoPartida } from '../models';
import { evaluarCondiciones } from './condicion-evaluator';

export function conversacionEsRevisitaDesbloqueada(
  estado: EstadoPartida,
  conversacionId: string,
): boolean {
  return estado.conversacionesRevisitaDesbloqueadas.includes(conversacionId);
}

export function conversacionPermiteRevisita(
  conversacion: Conversacion,
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): boolean {
  if (conversacionEsRevisitaDesbloqueada(estado, conversacion.id)) return true;
  if (!conversacion.requisitosRevisita?.length) return false;
  return evaluarCondiciones(conversacion.requisitosRevisita, estado, caso);
}

export function evaluarDesbloqueosRevisita(
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): string[] {
  const desbloqueados: string[] = [];
  const reglas = caso.manifest.desbloqueosRevisita ?? [];

  for (const regla of reglas) {
    if (!evaluarCondiciones(regla.requisitos, estado, caso)) continue;

    if (!estado.conversacionesRevisitaDesbloqueadas.includes(regla.conversacionId)) {
      estado.conversacionesRevisitaDesbloqueadas.push(regla.conversacionId);
      desbloqueados.push(regla.conversacionId);
    }

    if (regla.conversacionesUtilesExtra) {
      estado.bonusConversacionesUtiles[regla.personajeId] =
        (estado.bonusConversacionesUtiles[regla.personajeId] ?? 0) +
        regla.conversacionesUtilesExtra;
    }

    estado.historial.push({
      tipo: 'revisita_desbloqueada',
      entidadId: regla.conversacionId,
      descripcion: regla.id,
      timestamp: new Date().toISOString(),
    });
  }

  return desbloqueados;
}

export function desbloquearConversacionRevisita(
  estado: EstadoPartida,
  conversacionId: string,
  personajeId?: string,
  conversacionesExtra?: number,
): void {
  if (!estado.conversacionesRevisitaDesbloqueadas.includes(conversacionId)) {
    estado.conversacionesRevisitaDesbloqueadas.push(conversacionId);
  }

  const idx = estado.conversacionesEnFatiga.indexOf(conversacionId);
  if (idx >= 0) estado.conversacionesEnFatiga.splice(idx, 1);

  if (personajeId && conversacionesExtra) {
    estado.bonusConversacionesUtiles[personajeId] =
      (estado.bonusConversacionesUtiles[personajeId] ?? 0) + conversacionesExtra;
  }
}

export function restablecerConversacionesUtiles(
  estado: EstadoPartida,
  personajeId: string,
  cantidad: number,
): void {
  estado.bonusConversacionesUtiles[personajeId] =
    (estado.bonusConversacionesUtiles[personajeId] ?? 0) + cantidad;
}
