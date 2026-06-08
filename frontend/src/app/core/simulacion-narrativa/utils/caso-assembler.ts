import {
  CasoManifest,
  CasoNarrativoCompleto,
  Contradiccion,
  Conversacion,
  Escenario,
  EventoSimulacion,
  Evidencia,
  Hipotesis,
  IntervencionPsicologica,
  ObjetivoNarrativo,
  Personaje,
} from '../models';

function indexarPorId<T extends { id: string }>(entidades: T[]): Record<string, T> {
  return entidades.reduce<Record<string, T>>((acc, entidad) => {
    acc[entidad.id] = entidad;
    return acc;
  }, {});
}

export function ensamblarCasoNarrativo(
  manifest: CasoManifest,
  escenarios: Escenario[],
  personajes: Personaje[],
  conversaciones: Conversacion[],
  evidencias: Evidencia[],
  contradicciones: Contradiccion[],
  hipotesis: Hipotesis[],
  intervenciones: IntervencionPsicologica[],
  eventos: EventoSimulacion[] = [],
  objetivos: ObjetivoNarrativo[] = [],
): CasoNarrativoCompleto {
  validarIntegridadCaso(manifest, escenarios, personajes, conversaciones);

  return {
    manifest,
    escenarios: indexarPorId(escenarios),
    personajes: indexarPorId(personajes),
    conversaciones: indexarPorId(conversaciones),
    evidencias: indexarPorId(evidencias),
    contradicciones: indexarPorId(contradicciones),
    hipotesis: indexarPorId(hipotesis),
    intervenciones: indexarPorId(intervenciones),
    eventos: indexarPorId(eventos),
    objetivos: indexarPorId(objetivos),
  };
}

function validarIntegridadCaso(
  manifest: CasoManifest,
  escenarios: Escenario[],
  personajes: Personaje[],
  conversaciones: Conversacion[],
): void {
  const escenarioIds = new Set(escenarios.map((e) => e.id));
  const personajeIds = new Set(personajes.map((p) => p.id));
  const conversacionIds = new Set(conversaciones.map((c) => c.id));

  if (!escenarioIds.has(manifest.escenarioInicialId)) {
    throw new Error(
      `El escenario inicial "${manifest.escenarioInicialId}" no existe en el caso "${manifest.id}".`,
    );
  }

  for (const escenario of escenarios) {
    for (const personajeId of escenario.personajesPresentes) {
      if (!personajeIds.has(personajeId)) {
        throw new Error(
          `Escenario "${escenario.id}": personaje "${personajeId}" no definido en el caso "${manifest.id}".`,
        );
      }
    }

    if (escenario.conversacionInicialId && !conversacionIds.has(escenario.conversacionInicialId)) {
      throw new Error(
        `Escenario "${escenario.id}": conversación "${escenario.conversacionInicialId}" no definida.`,
      );
    }

    for (const variante of escenario.variantes ?? []) {
      for (const convId of variante.conversacionesDisponibles ?? []) {
        if (!conversacionIds.has(convId)) {
          throw new Error(
            `Variante "${variante.id}" del escenario "${escenario.id}": conversación "${convId}" inexistente.`,
          );
        }
      }
    }
  }

  for (const conversacion of conversaciones) {
    const nodoIds = new Set(conversacion.nodos.map((n) => n.id));
    if (!nodoIds.has(conversacion.nodoInicialId)) {
      throw new Error(
        `Conversación "${conversacion.id}": nodo inicial "${conversacion.nodoInicialId}" inexistente.`,
      );
    }

    if (conversacion.saludoMemoria) {
      for (const nodoId of Object.values(conversacion.saludoMemoria)) {
        if (nodoId && !nodoIds.has(nodoId)) {
          throw new Error(
            `Conversación "${conversacion.id}": nodo de saludo "${nodoId}" inexistente.`,
          );
        }
      }
    }
  }
}
