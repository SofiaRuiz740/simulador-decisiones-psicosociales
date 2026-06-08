import { Condicion } from '../../../core/simulacion-narrativa/models/condicion.model';

/** Posición en porcentaje relativo al escenario (0–100). */
export interface PosicionEscena {
  /** Horizontal: centro para sprites, borde izquierdo para hotspots. */
  x: number;
  /** Vertical: pies del sprite (%); borde superior para hotspots legacy. */
  y: number;
  ancho: number;
  alto: number;
}

export type TipoHotspotEscena =
  | 'navegacion'
  | 'evidencia'
  | 'transicion_narrativa'
  | 'conversacion';

export interface HotspotEscena {
  id: string;
  etiqueta: string;
  tipo: TipoHotspotEscena;
  posicion: PosicionEscena;
  /** Escena visual destino (tipo navegacion). */
  destinoEscenaId?: string;
  /** Id de evidencia narrativa (tipo evidencia). */
  evidenciaId?: string;
  /** Id de transición del escenario narrativo (tipo transicion_narrativa). */
  transicionNarrativaId?: string;
  /** Conversación clínica (tipo conversacion). */
  conversacionId?: string;
  /** Activa zoom y oscurecimiento al iniciar diálogo. */
  modoAcercamiento?: boolean;
  /** Etiqueta alternativa para regreso. */
  esRegreso?: boolean;
  /** Requisitos narrativos para mostrar o usar este hotspot. */
  requisitosAcceso?: Condicion[];
}

/** Metadatos de hotspot de personaje (clave JSON legacy: `sprites`). Solo posición e identificación — nunca renderiza imagen. */
export interface HotspotPersonajeConfig {
  id: string;
  /** Id del personaje en el motor narrativo (agrupación y nombre). */
  personajeId: string;
  /** Rol clínico genérico — usado para retrato *-conversar en diálogos. */
  rolVisual?: string;
  /** Conversación que se abre al hacer clic en el hotspot. */
  conversacionId: string;
  /** Área clickeable (%). */
  posicion: PosicionEscena;
  /** @deprecated Sin efecto visual; reservado por compatibilidad JSON. */
  escala?: number;
  /** Etiqueta para tooltip. */
  etiqueta?: string;
  etiquetaInteraccion?: string;
  modoAcercamiento?: boolean;
  visibleConEscenarioNarrativoId?: string;
}

/** @deprecated Alias JSON — usar HotspotPersonajeConfig. */
export type SpriteEscena = HotspotPersonajeConfig;

export interface EscenaVisual {
  id: string;
  titulo: string;
  /** El id de la escena coincide con el escenario visual registrado en AssetService. */
  /** Escenario narrativo asociado (para sincronización opcional). */
  escenarioNarrativoId?: string;
  hotspots: HotspotEscena[];
  /** Hotspots de personaje (solo metadatos: posición, tooltip, conversación). */
  sprites: HotspotPersonajeConfig[];
  /** Requisitos narrativos para acceder a esta escena (mapa y navegación). */
  requisitosAcceso?: Condicion[];
}

export interface ConfigExploracionVisual {
  id: string;
  version: string;
  casoId: string;
  escenaInicialId: string;
  /** Mapeo opcional personajeId narrativo → rolVisual (p. ej. diálogos sin sprite). */
  mapeoRolesVisuales?: Record<string, string>;
  escenas: EscenaVisual[];
}

export function posicionCss(posicion: PosicionEscena): Record<string, string> {
  return {
    left: `${posicion.x}%`,
    top: `${posicion.y}%`,
    width: `${posicion.ancho}%`,
    height: `${posicion.alto}%`,
  };
}