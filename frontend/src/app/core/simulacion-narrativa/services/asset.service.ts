import { Injectable } from '@angular/core';

import {
  BASE_ASSETS_SIMULACION,
  ESCENARIOS_REGISTRADOS,
  EscenarioId,
  ExpresionRetrato,
  ICONOS_REGISTRADOS,
  IconoId,
  INTRO_FONDOS_REGISTRADOS,
  IntroFondoId,
  ReferenciaVisualPersonaje,
  RETRATOS_CONVERSAR_REGISTRADOS,
  RETRATOS_CONVERSAR_FALLBACK,
  RETRATOS_EXPRESION_REGISTRADOS,
  RETRATOS_NEUTRAL_REGISTRADOS,
  ROL_VISUAL_POR_CONVERSACION,
  ROLES_VISUALES_REGISTRADOS,
  RolVisualId,
} from '../models/asset.model';

@Injectable({ providedIn: 'root' })
export class AssetService {
  obtenerEscenario(id: EscenarioId | string): string {
    const ruta = ESCENARIOS_REGISTRADOS[id as EscenarioId];
    if (!ruta) {
      console.warn(`[AssetService] Escenario no registrado: "${id}"`);
      return '';
    }
    return this.resolverUrl(ruta);
  }

  obtenerIntroFondo(id: IntroFondoId): string {
    const ruta = INTRO_FONDOS_REGISTRADOS[id];
    if (!ruta) {
      console.warn(`[AssetService] Fondo de intro no registrado: "${id}"`);
      return '';
    }
    return this.resolverUrl(ruta);
  }

  /** Resuelve cualquier ruta relativa bajo /assets/simulacion-narrativa/ */
  resolverRutaAsset(rutaRelativa: string): string {
    return this.resolverUrl(rutaRelativa);
  }

  obtenerPersonajePorRol(rol: RolVisualId | string): string {
    const ruta = ROLES_VISUALES_REGISTRADOS[rol as RolVisualId];
    if (!ruta) {
      console.warn(`[AssetService] Rol visual no registrado: "${rol}"`);
      return '';
    }
    return this.resolverUrl(ruta);
  }

  /**
   * Retrato recortado para diálogo (variante *-conversar).
   * No usar sprites integrados del escenario.
   */
  obtenerRetratoConversacion(rol: RolVisualId | string): string {
    const rolId = rol as RolVisualId;
    const rutaConversar = RETRATOS_CONVERSAR_REGISTRADOS[rolId];
    if (rutaConversar) {
      return this.resolverUrl(rutaConversar);
    }

    const rutaFallback =
      RETRATOS_CONVERSAR_FALLBACK[rolId] ?? ROLES_VISUALES_REGISTRADOS[rolId];
    if (rutaFallback) {
      console.warn(
        `[AssetService] Retrato conversar no registrado para "${rol}" — usando retrato base`,
      );
      return this.resolverUrl(rutaFallback);
    }

    console.warn(`[AssetService] Retrato conversar no registrado: "${rol}"`);
    return '';
  }

  resolverRetratoConversacion(ref: ReferenciaVisualPersonaje): string {
    const rolPorConversacion = ref.conversacionId
      ? ROL_VISUAL_POR_CONVERSACION[ref.conversacionId]
      : undefined;
    if (rolPorConversacion) {
      return this.obtenerRetratoConversacion(rolPorConversacion);
    }

    if (ref.rolVisual) {
      return this.obtenerRetratoConversacion(ref.rolVisual);
    }
    if (ref.personajeId && ROLES_VISUALES_REGISTRADOS[ref.personajeId as RolVisualId]) {
      return this.obtenerRetratoConversacion(ref.personajeId);
    }
    console.warn(
      `[AssetService] Sin retrato conversar para personajeId "${ref.personajeId ?? ''}"`,
    );
    return '';
  }

  /**
   * @deprecated Personajes integrados en escenarios; no renderizar en exploración.
   */
  resolverPersonaje(ref: ReferenciaVisualPersonaje): string {
    if (ref.rolVisual) {
      return this.obtenerPersonajePorRol(ref.rolVisual);
    }
    if (ref.personajeId) {
      return this.obtenerPersonajeLegacy(ref.personajeId);
    }
    console.warn('[AssetService] Referencia visual sin rolVisual ni personajeId');
    return '';
  }

  obtenerRetratoPorRol(
    rol: RolVisualId | string,
    expresion: ExpresionRetrato = 'neutral',
  ): string {
    const rolId = rol as RolVisualId;

    if (expresion === 'neutral') {
      return this.obtenerRetratoConversacion(rolId);
    }

    const ruta = RETRATOS_EXPRESION_REGISTRADOS[rolId]?.[expresion];
    if (!ruta) {
      console.warn(
        `[AssetService] Retrato "${expresion}" no registrado para rol: "${rol}" — usando conversar`,
      );
      return this.obtenerRetratoConversacion(rolId);
    }
    return this.resolverUrl(ruta);
  }

  /**
   * Resuelve retrato de diálogo (siempre variante *-conversar).
   */
  resolverRetrato(
    ref: ReferenciaVisualPersonaje,
    expresion: ExpresionRetrato = 'neutral',
  ): string {
    if (expresion !== 'neutral') {
      if (ref.rolVisual) {
        return this.obtenerRetratoPorRol(ref.rolVisual, expresion);
      }
      if (ref.personajeId) {
        return this.obtenerRetratoLegacy(ref.personajeId, expresion);
      }
      return '';
    }
    return this.resolverRetratoConversacion(ref);
  }

  /** @deprecated Usar resolverPersonaje o obtenerPersonajePorRol. */
  obtenerPersonaje(id: string): string {
    return this.obtenerPersonajeLegacy(id);
  }

  /** @deprecated Usar resolverRetrato o obtenerRetratoPorRol. */
  obtenerRetrato(id: string, expresion: ExpresionRetrato = 'neutral'): string {
    return this.obtenerRetratoLegacy(id, expresion);
  }

  obtenerIcono(id: IconoId): string {
    const ruta = ICONOS_REGISTRADOS[id];
    if (!ruta) {
      console.warn(`[AssetService] Icono no registrado: "${id}"`);
      return '';
    }
    return this.resolverUrl(ruta);
  }

  obtenerIconoHotspot(tipo: 'navegacion' | 'evidencia' | 'transicion_narrativa' | 'conversacion'): string {
    switch (tipo) {
      case 'evidencia':
        return this.obtenerIcono('evidencia');
      case 'transicion_narrativa':
        return this.obtenerIcono('hipotesis');
      case 'conversacion':
        return this.obtenerIcono('conversacion');
      default:
        return this.obtenerIcono('libreta');
    }
  }

  private obtenerPersonajeLegacy(id: string): string {
    const ruta = ROLES_VISUALES_REGISTRADOS[id as RolVisualId];
    if (ruta) {
      return this.resolverUrl(ruta);
    }
    console.warn(
      `[AssetService] personajeId "${id}" sin rolVisual y sin registro visual explícito`,
    );
    return '';
  }

  private obtenerRetratoLegacy(id: string, expresion: ExpresionRetrato): string {
    if (ROLES_VISUALES_REGISTRADOS[id as RolVisualId]) {
      if (expresion === 'neutral') {
        return this.obtenerRetratoConversacion(id);
      }
      return this.obtenerRetratoPorRol(id, expresion);
    }
    console.warn(
      `[AssetService] personajeId "${id}" sin rolVisual y sin retrato registrado`,
    );
    return '';
  }

  private resolverUrl(rutaRelativa: string): string {
    return `${BASE_ASSETS_SIMULACION}/${rutaRelativa}`;
  }
}
