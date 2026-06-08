import {
  ConfigFatigaPersonaje,
  Conversacion,
  LIMITE_CONVERSACIONES_UTILES_DEFAULT,
  MENSAJES_FATIGA_DEFAULT,
  NodoDialogo,
  Personaje,
} from '../models';
import { EstadoPartida } from '../models/estado-partida.model';

export function obtenerLimiteConversaciones(
  personaje: Personaje,
  estado?: EstadoPartida,
): number {
  const base =
    personaje.configFatiga?.limiteConversacionesUtiles ?? LIMITE_CONVERSACIONES_UTILES_DEFAULT;
  const bonus = estado ? (estado.bonusConversacionesUtiles[personaje.id] ?? 0) : 0;
  return base + bonus;
}

export function conversacionesUtilesRestantes(
  estado: EstadoPartida,
  personaje: Personaje,
): number {
  const usadas = estado.conversacionesUtilesPorPersonaje[personaje.id] ?? 0;
  return Math.max(0, obtenerLimiteConversaciones(personaje, estado) - usadas);
}

export function personajeAgotado(estado: EstadoPartida, personaje: Personaje): boolean {
  return conversacionesUtilesRestantes(estado, personaje) <= 0;
}

export function cuentaComoConversacionUtil(conversacion: Conversacion): boolean {
  if (conversacion.noConsumeConversacionUtil) return false;
  return conversacion.cuentaComoUtil !== false;
}

export function obtenerMensajeFatiga(personaje: Personaje): string {
  const mensajes =
    personaje.configFatiga?.mensajesAgotamiento ?? [...MENSAJES_FATIGA_DEFAULT];
  const indice = Math.floor(Math.random() * mensajes.length);
  return mensajes[indice];
}

export function crearNodoFatiga(
  conversacion: Conversacion,
  personaje: Personaje,
): NodoDialogo {
  return {
    id: `fatiga-${conversacion.id}`,
    emisor: 'personaje',
    personajeId: personaje.id,
    texto: obtenerMensajeFatiga(personaje),
  };
}

export function incrementarConversacionUtil(
  estado: EstadoPartida,
  personajeId: string,
): void {
  estado.conversacionesUtilesPorPersonaje[personajeId] =
    (estado.conversacionesUtilesPorPersonaje[personajeId] ?? 0) + 1;
}

export function resolverConfigFatiga(personaje: Personaje): Required<ConfigFatigaPersonaje> {
  return {
    limiteConversacionesUtiles:
      personaje.configFatiga?.limiteConversacionesUtiles ?? LIMITE_CONVERSACIONES_UTILES_DEFAULT,
    mensajesAgotamiento:
      personaje.configFatiga?.mensajesAgotamiento ?? [...MENSAJES_FATIGA_DEFAULT],
  };
}
