import {
  CasoNarrativoCompleto,
  Conversacion,
  EstadoPartida,
  NodoDialogo,
  Personaje,
  TonoRelacionMemoria,
} from '../models';
import {
  ConfigMemoriaNarrativa,
  MEMORIA_DEFAULT,
  MemoriaPersonajeEstado,
  crearMemoriaPersonajeVacia,
} from '../models/memoria-narrativa.model';
import { evaluarCondiciones } from './condicion-evaluator';

export function obtenerMemoriaPersonaje(
  estado: EstadoPartida,
  personajeId: string,
): MemoriaPersonajeEstado {
  if (!estado.memoriaPersonajes[personajeId]) {
    estado.memoriaPersonajes[personajeId] = crearMemoriaPersonajeVacia();
  }
  return estado.memoriaPersonajes[personajeId];
}

export function resolverConfigMemoria(personaje: Personaje): Required<ConfigMemoriaNarrativa> {
  return {
    umbralConfianzaAlta:
      personaje.memoriaNarrativa?.umbralConfianzaAlta ?? MEMORIA_DEFAULT.umbralConfianzaAlta,
    umbralConfianzaBaja:
      personaje.memoriaNarrativa?.umbralConfianzaBaja ?? MEMORIA_DEFAULT.umbralConfianzaBaja,
    umbralTensionAnsiedad:
      personaje.memoriaNarrativa?.umbralTensionAnsiedad ?? MEMORIA_DEFAULT.umbralTensionAnsiedad,
  };
}

export function determinarTonoRelacion(
  estado: EstadoPartida,
  personaje: Personaje,
): TonoRelacionMemoria {
  const config = resolverConfigMemoria(personaje);
  const metricas = estado.metricasPersonajes[personaje.id];
  const memoria = obtenerMemoriaPersonaje(estado, personaje.id);

  if (memoria.huboConfrontacion && (metricas?.ansiedad ?? 0) >= config.umbralTensionAnsiedad) {
    return 'tension';
  }
  if ((metricas?.confianza ?? 0) >= config.umbralConfianzaAlta) return 'confianza_alta';
  if ((metricas?.confianza ?? 0) <= config.umbralConfianzaBaja) return 'confianza_baja';
  return 'neutral';
}

export function resolverNodoInicialConMemoria(
  conversacion: Conversacion,
  estado: EstadoPartida,
  personaje: Personaje | undefined,
): string {
  if (!personaje || !conversacion.saludoMemoria) {
    return conversacion.nodoInicialId;
  }

  const tono = determinarTonoRelacion(estado, personaje);
  const memoria = obtenerMemoriaPersonaje(estado, personaje.id);

  if (memoria.conversacionesTotales === 0) {
    return conversacion.nodoInicialId;
  }

  const nodoPorTono = conversacion.saludoMemoria[tono];
  if (nodoPorTono && conversacion.nodos.some((n) => n.id === nodoPorTono)) {
    return nodoPorTono;
  }

  return conversacion.saludoMemoria.neutral ?? conversacion.nodoInicialId;
}

export function resolverTextoNodo(
  nodo: NodoDialogo,
  estado: EstadoPartida,
  caso: CasoNarrativoCompleto | null,
  personaje?: Personaje,
): string {
  if (!nodo.variantesTexto?.length || !personaje) return nodo.texto;

  const tono = determinarTonoRelacion(estado, personaje);
  const porTono = nodo.variantesTexto.find(
    (v) => v.tono === tono && evaluarCondiciones(v.requisitos, estado, caso),
  );
  if (porTono) return porTono.texto;

  const alternativa = nodo.variantesTexto.find((v) =>
    evaluarCondiciones(v.requisitos, estado, caso),
  );
  return alternativa?.texto ?? nodo.texto;
}

export function actualizarMemoriaTrasConversacionCompleta(
  estado: EstadoPartida,
  personajeId: string,
): void {
  const memoria = obtenerMemoriaPersonaje(estado, personajeId);
  const metricas = estado.metricasPersonajes[personajeId];

  memoria.conversacionesTotales += 1;
  memoria.ultimaInteraccion = new Date().toISOString();

  if (metricas) {
    memoria.confianzaMaximaAlcanzada = Math.max(
      memoria.confianzaMaximaAlcanzada,
      metricas.confianza,
    );
    memoria.confianzaMinimaAlcanzada = Math.min(
      memoria.confianzaMinimaAlcanzada,
      metricas.confianza,
    );
  }
}

export function registrarConfrontacionEnMemoria(
  estado: EstadoPartida,
  personajeId: string,
): void {
  obtenerMemoriaPersonaje(estado, personajeId).huboConfrontacion = true;
}

export function inicializarMemoriaPersonajes(
  estado: EstadoPartida,
  personajes: Personaje[],
): void {
  for (const personaje of personajes) {
    estado.memoriaPersonajes[personaje.id] = crearMemoriaPersonajeVacia();
  }
}
