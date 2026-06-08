import { Condicion } from './condicion.model';

export type TonoRelacionMemoria =
  | 'confianza_alta'
  | 'confianza_baja'
  | 'tension'
  | 'neutral';

export interface ConfigMemoriaNarrativa {
  umbralConfianzaAlta?: number;
  umbralConfianzaBaja?: number;
  umbralTensionAnsiedad?: number;
}

export interface MemoriaPersonajeEstado {
  conversacionesTotales: number;
  confianzaMaximaAlcanzada: number;
  confianzaMinimaAlcanzada: number;
  huboConfrontacion: boolean;
  ultimaInteraccion?: string;
}

export interface VarianteTextoMemoria {
  tono: TonoRelacionMemoria;
  texto: string;
  requisitos?: Condicion[];
}

export interface SaludoMemoriaConversacion {
  confianza_alta?: string;
  confianza_baja?: string;
  tension?: string;
  neutral?: string;
}

export const MEMORIA_DEFAULT: Required<ConfigMemoriaNarrativa> = {
  umbralConfianzaAlta: 60,
  umbralConfianzaBaja: 30,
  umbralTensionAnsiedad: 70,
};

export function crearMemoriaPersonajeVacia(): MemoriaPersonajeEstado {
  return {
    conversacionesTotales: 0,
    confianzaMaximaAlcanzada: 0,
    confianzaMinimaAlcanzada: 100,
    huboConfrontacion: false,
  };
}
