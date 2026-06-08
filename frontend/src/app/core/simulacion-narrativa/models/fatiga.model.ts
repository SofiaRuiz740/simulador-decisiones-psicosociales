export const LIMITE_CONVERSACIONES_UTILES_DEFAULT = 3;

export const MENSAJES_FATIGA_DEFAULT = [
  'No tengo nada más que agregar.',
  'No recuerdo más detalles.',
  'Prefiero no seguir hablando.',
] as const;

export interface ConfigFatigaPersonaje {
  limiteConversacionesUtiles?: number;
  mensajesAgotamiento?: string[];
}
