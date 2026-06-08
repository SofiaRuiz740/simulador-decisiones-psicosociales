import { Afirmacion } from './afirmacion.model';
import { Condicion } from './condicion.model';
import { Efecto } from './efecto.model';
import { EstrategiaClinica } from './estrategia-clinica.model';
import { ModificadoresMetricas } from './metricas-personaje.model';
import { SaludoMemoriaConversacion, VarianteTextoMemoria } from './memoria-narrativa.model';

export type EmisorDialogo = 'jugador' | 'personaje' | 'narrador';

export interface OpcionDialogo {
  id: string;
  texto: string;
  /** Estrategia profesional que representa esta opción (no implica corrección). */
  estrategiaClinica: EstrategiaClinica;
  /** @deprecated Usar estrategiaClinica. Se conserva como texto libre opcional. */
  enfoque?: string;
  siguienteNodoId?: string;
  requisitos?: Condicion[];
  efectos?: Efecto[];
  /** Modificadores adicionales de métricas sobre el perfil base de la estrategia. */
  modificadoresMetricas?: ModificadoresMetricas;
}

export interface NodoDialogo {
  id: string;
  emisor: EmisorDialogo;
  personajeId?: string;
  texto: string;
  /** Textos alternativos según memoria narrativa del personaje. */
  variantesTexto?: VarianteTextoMemoria[];
  opciones?: OpcionDialogo[];
  siguienteNodoId?: string;
  efectosAlMostrar?: Efecto[];
  testimonio?: Afirmacion;
}

export interface Conversacion {
  id: string;
  titulo?: string;
  escenarioId?: string;
  personajeId?: string;
  nodoInicialId: string;
  nodos: NodoDialogo[];
  requisitosAcceso?: Condicion[];
  cuentaComoUtil?: boolean;
  /** Nodos de saludo según tono de relación previa con el personaje. */
  saludoMemoria?: SaludoMemoriaConversacion;
  /** Si es true, no consume cupo de conversaciones útiles. */
  noConsumeConversacionUtil?: boolean;
  /** Requisitos para acceder pese a fatiga del personaje (revisita). */
  requisitosRevisita?: Condicion[];
}
