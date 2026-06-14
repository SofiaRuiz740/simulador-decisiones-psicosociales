import { Injectable } from '@angular/core';

import {
  ContextoPartidaPersistida,
  PARTIDA_PERSISTENCIA_VERSION,
  PartidaPersistida,
  clavePartidaPersistida,
  escribirPartidaPersistida,
  leerPartidaPersistida,
  partidaPersistidaValidaParaCaso,
  sanitizarEstadoParaPersistencia,
} from '../utils/partida-persistencia.util';
import { EstadoPartida } from '../models/estado-partida.model';

@Injectable({ providedIn: 'root' })
export class NarrativaPersistenciaService {
  private contexto: ContextoPartidaPersistida | null = null;
  private escenaVisualRestaurada: string | null = null;

  establecerContexto(contexto: ContextoPartidaPersistida): void {
    this.contexto = contexto;
  }

  obtenerContexto(): ContextoPartidaPersistida | null {
    return this.contexto;
  }

  cargarPartidaGuardada(casoId: string): PartidaPersistida | null {
    const clave = this.resolverClave();
    if (!clave) return null;

    const partida = leerPartidaPersistida(clave);
    if (!partidaPersistidaValidaParaCaso(partida, casoId)) return null;

    this.escenaVisualRestaurada = partida.escenaVisualId;
    return partida;
  }

  consumirEscenaVisualRestaurada(): string | null {
    const id = this.escenaVisualRestaurada;
    this.escenaVisualRestaurada = null;
    return id;
  }

  guardarPartida(estado: EstadoPartida, escenaVisualId: string | null): void {
    const clave = this.resolverClave();
    if (!clave || !this.contexto) return;

    const previa = leerPartidaPersistida(clave);
    const escena =
      escenaVisualId ??
      previa?.escenaVisualId ??
      null;

    const partida: PartidaPersistida = {
      version: PARTIDA_PERSISTENCIA_VERSION,
      estado: sanitizarEstadoParaPersistencia(estado),
      escenaVisualId: escena,
      guardadoEn: new Date().toISOString(),
    };

    escribirPartidaPersistida(clave, partida);
  }

  private resolverClave(): string | null {
    if (!this.contexto?.casoId) return null;
    return clavePartidaPersistida(this.contexto);
  }
}
