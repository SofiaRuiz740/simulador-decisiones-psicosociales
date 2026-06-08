import {
  CasoNarrativoCompleto,
  Escenario,
  EscenarioResuelto,
  EstadoPartida,
  VarianteEscenario,
} from '../models';
import { evaluarCondiciones } from './condicion-evaluator';

function resolverVarianteActiva(
  escenario: Escenario,
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): VarianteEscenario | undefined {
  const variantes = [...(escenario.variantes ?? [])].sort(
    (a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0),
  );

  return variantes.find((v) => evaluarCondiciones(v.requisitos, estado, caso));
}

export function resolverEscenarioDinamico(
  escenario: Escenario,
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto,
): EscenarioResuelto {
  const variante = resolverVarianteActiva(escenario, estado, caso);

  return {
    id: escenario.id,
    orden: escenario.orden,
    titulo: variante?.titulo ?? escenario.titulo,
    narrativa: variante?.narrativa ?? escenario.narrativa,
    ubicacion: variante?.ubicacion ?? escenario.ubicacion,
    momentoTemporal: variante?.momentoTemporal ?? escenario.momentoTemporal,
    personajesPresentes:
      variante?.personajesPresentes ?? escenario.personajesPresentes,
    conversacionesDisponibles:
      variante?.conversacionesDisponibles ?? escenario.conversacionesDisponibles ?? [],
    evidenciasDisponibles:
      variante?.evidenciasDisponibles ?? escenario.evidenciasDisponibles ?? [],
    intervencionesDisponibles:
      variante?.intervencionesDisponibles ?? escenario.intervencionesDisponibles ?? [],
    varianteActivaId: variante?.id,
    escenarioBase: escenario,
  };
}

export function resolverEscenarioPorId(
  caso: CasoNarrativoCompleto,
  estado: EstadoPartida,
  escenarioId: string,
): EscenarioResuelto | null {
  const escenario = caso.escenarios[escenarioId];
  if (!escenario) return null;
  return resolverEscenarioDinamico(escenario, estado, caso);
}
