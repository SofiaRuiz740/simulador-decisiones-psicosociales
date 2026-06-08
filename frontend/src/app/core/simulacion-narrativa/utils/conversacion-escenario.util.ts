import { CasoNarrativoCompleto, Conversacion, EstadoPartida } from '../models';
import { resolverEscenarioPorId } from './escenario-dinamico.util';

/**
 * Una conversación está disponible en el escenario actual si:
 * - su escenarioId coincide con el escenario activo, y
 * - está listada en conversacionesDisponibles del escenario resuelto (si la lista no está vacía).
 */
export function conversacionPerteneceEscenarioActual(
  conversacion: Conversacion,
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): boolean {
  const escenarioResuelto = resolverEscenarioPorId(caso, estado, estado.escenarioActualId);
  if (!escenarioResuelto) return false;

  const escenarioConversacion = conversacion.escenarioId ?? estado.escenarioActualId;
  if (escenarioConversacion !== estado.escenarioActualId) return false;

  const lista = escenarioResuelto.conversacionesDisponibles;
  if (lista.length > 0) {
    return lista.includes(conversacion.id);
  }

  return true;
}
