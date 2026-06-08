import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ROL_VISUAL_POR_CONVERSACION } from '../../../core/simulacion-narrativa/models/asset.model';
import { environment } from '../../../../environments/environment';
import {
  ConfigExploracionVisual,
  EscenaVisual,
  HotspotPersonajeConfig,
  SpriteEscena,
} from '../models/escena-visual.model';
import { escenaEsAccesible } from '../utils/escena-acceso.util';
import { CasoNarrativoCompleto } from '../../../core/simulacion-narrativa/models/caso.model';
import { EstadoPartida } from '../../../core/simulacion-narrativa/models/estado-partida.model';

@Injectable({ providedIn: 'root' })
export class EscenaVisualService {
  private readonly http = inject(HttpClient);

  private readonly _config = signal<ConfigExploracionVisual | null>(null);
  private readonly _escenaActualId = signal<string | null>(null);
  private readonly _transicionActiva = signal(false);

  readonly config = this._config.asReadonly();
  readonly escenaActualId = this._escenaActualId.asReadonly();
  readonly transicionActiva = this._transicionActiva.asReadonly();

  readonly escenaActual = computed<EscenaVisual | null>(() => {
    const cfg = this._config();
    const id = this._escenaActualId();
    if (!cfg || !id) return null;
    return cfg.escenas.find((escena) => escena.id === id) ?? null;
  });

  /**
   * Rol visual para diálogo: conversación activa prevalece sobre mapeo global.
   * Evita que lucia → madre-victima sustituya victima-conversar en UCI.
   */
  rolVisualParaConversacion(personajeId: string, conversacionId?: string): string | undefined {
    if (conversacionId) {
      const rolPorConversacion = ROL_VISUAL_POR_CONVERSACION[conversacionId];
      if (rolPorConversacion) return rolPorConversacion;
    }
    return this.rolVisualDePersonaje(personajeId);
  }

  /** personajeId narrativo → rolVisual clínico (sprites + mapeo explícito). */
  rolVisualDePersonaje(personajeId: string): string | undefined {
    const cfg = this._config();
    if (!cfg) return undefined;

    const desdeMapeo = cfg.mapeoRolesVisuales?.[personajeId];
    if (desdeMapeo) return desdeMapeo;

    for (const escena of cfg.escenas) {
      for (const sprite of escena.sprites) {
        if (sprite.personajeId === personajeId && sprite.rolVisual) {
          return sprite.rolVisual;
        }
      }
    }

    return undefined;
  }

  cargarConfiguracion(casoId: string): Observable<ConfigExploracionVisual> {
    const url = `${environment.simulacionNarrativaDataUrl}/visual/${casoId}/escenas-hospital.json`;
    return this.http.get<ConfigExploracionVisual>(url).pipe(
      tap((config) => {
        this._config.set(config);
        this._escenaActualId.set(config.escenaInicialId);
      }),
    );
  }

  irAEscena(
    escenaId: string,
    estado?: EstadoPartida | null,
    caso?: CasoNarrativoCompleto | null,
  ): boolean {
    const cfg = this._config();
    const destino = cfg?.escenas.find((escena) => escena.id === escenaId);
    if (!destino) return false;

    if (estado && !escenaEsAccesible(destino, estado, caso)) {
      return false;
    }

    if (this._escenaActualId() === escenaId) return true;

    this._transicionActiva.set(true);
    window.setTimeout(() => {
      this._escenaActualId.set(escenaId);
      this._transicionActiva.set(false);
    }, 260);

    return true;
  }

  obtenerEscena(escenaId: string): EscenaVisual | undefined {
    return this._config()?.escenas.find((escena) => escena.id === escenaId);
  }

  escenasAccesibles(
    estado: EstadoPartida | null | undefined,
    caso: CasoNarrativoCompleto | null | undefined,
  ): EscenaVisual[] {
    const cfg = this._config();
    if (!cfg || !estado) return [];
    return cfg.escenas.filter((escena) => escenaEsAccesible(escena, estado, caso));
  }

  reiniciar(): void {
    this._config.set(null);
    this._escenaActualId.set(null);
  }
}

/** Hotspot de personaje resuelto para la escena (sin renderizado visual). */
export interface HotspotPersonajeEnEscena {
  hotspot: HotspotPersonajeConfig;
  interactuable: boolean;
}

/** @deprecated Usar HotspotPersonajeEnEscena */
export type SpriteEnEscena = { sprite: HotspotPersonajeConfig; interactuable: boolean };

export function resolverHotspotsPersonajeEnEscena(
  hotspots: HotspotPersonajeConfig[],
  opciones: {
    escenarioNarrativoActual?: string;
    conversacionesDisponibles: string[];
    conversacionesEnProgreso: string[];
    conversacionesCompletadas: string[];
  },
): HotspotPersonajeEnEscena[] {
  const {
    escenarioNarrativoActual,
    conversacionesDisponibles,
    conversacionesEnProgreso,
    conversacionesCompletadas,
  } = opciones;

  const completadas = new Set(conversacionesCompletadas);
  const disponiblesSet = new Set(conversacionesDisponibles);
  const enCursoSet = new Set(conversacionesEnProgreso);
  const porPersonaje = new Map<string, HotspotPersonajeConfig[]>();

  for (const hotspot of hotspots) {
    if (
      hotspot.visibleConEscenarioNarrativoId &&
      hotspot.visibleConEscenarioNarrativoId !== escenarioNarrativoActual
    ) {
      continue;
    }
    const lista = porPersonaje.get(hotspot.personajeId) ?? [];
    lista.push(hotspot);
    porPersonaje.set(hotspot.personajeId, lista);
  }

  const visibles: HotspotPersonajeEnEscena[] = [];

  for (const lista of porPersonaje.values()) {
    const enCurso = lista.find(
      (hotspot) =>
        enCursoSet.has(hotspot.conversacionId) && !completadas.has(hotspot.conversacionId),
    );
    if (enCurso) {
      visibles.push({ hotspot: enCurso, interactuable: true });
      continue;
    }

    const disponible = lista.find((hotspot) => disponiblesSet.has(hotspot.conversacionId));
    if (disponible) {
      visibles.push({ hotspot: disponible, interactuable: true });
      continue;
    }

    const referencia = lista[0];
    if (referencia && !completadas.has(referencia.conversacionId)) {
      visibles.push({ hotspot: referencia, interactuable: false });
    }
  }

  return visibles;
}

/** @deprecated Usar resolverHotspotsPersonajeEnEscena */
export function resolverSpritesEnEscena(
  sprites: HotspotPersonajeConfig[],
  opciones: Parameters<typeof resolverHotspotsPersonajeEnEscena>[1],
): SpriteEnEscena[] {
  return resolverHotspotsPersonajeEnEscena(sprites, opciones).map((item) => ({
    sprite: item.hotspot,
    interactuable: item.interactuable,
  }));
}

/** @deprecated Usar resolverSpritesEnEscena. */
export function filtrarSpritesVisibles(
  sprites: SpriteEscena[],
  opciones: {
    escenarioNarrativoActual?: string;
    conversacionesDisponibles: string[];
    conversacionesEnProgreso: string[];
    conversacionesCompletadas: string[];
  },
): SpriteEscena[] {
  const {
    escenarioNarrativoActual,
    conversacionesDisponibles,
    conversacionesEnProgreso,
    conversacionesCompletadas,
  } = opciones;

  const completadas = new Set(conversacionesCompletadas);
  const porPersonaje = new Map<string, SpriteEscena[]>();

  for (const sprite of sprites) {
    if (
      sprite.visibleConEscenarioNarrativoId &&
      sprite.visibleConEscenarioNarrativoId !== escenarioNarrativoActual
    ) {
      continue;
    }
    const lista = porPersonaje.get(sprite.personajeId) ?? [];
    lista.push(sprite);
    porPersonaje.set(sprite.personajeId, lista);
  }

  const visibles: SpriteEscena[] = [];

  for (const lista of porPersonaje.values()) {
    const enCurso = lista.find(
      (sprite) =>
        conversacionesEnProgreso.includes(sprite.conversacionId) &&
        !completadas.has(sprite.conversacionId),
    );
    if (enCurso) {
      visibles.push(enCurso);
      continue;
    }

    const disponible = lista.find((sprite) =>
      conversacionesDisponibles.includes(sprite.conversacionId),
    );
    if (disponible) visibles.push(disponible);
  }

  return visibles;
}
