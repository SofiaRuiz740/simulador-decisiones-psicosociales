import { Injectable, computed, signal } from '@angular/core';

import {
  PracticaEstudianteActiva,
  PracticaEstudianteRegistro,
  ProgresoPracticaLocal,
  EstadoPracticaEstudiante,
} from '../models/estudiante-session.model';
import { AccesoEstudianteRespuesta } from '../models/practicas.model';
import { resolverCasoNarrativoId } from '../utils/caso-narrativo.util';
import { clavesIntroRelacionadas } from '../simulacion-narrativa/utils/introduccion-narrativa.util';
import {
  borrarPartidaPersistida,
  clavePartidaPersistida,
} from '../simulacion-narrativa/utils/partida-persistencia.util';

const ACCESS_KEY = 'simulador.access';
const REFRESH_KEY = 'simulador.refresh';
const USER_KEY = 'simulador.user';
const PRACTICA_ACTIVA_KEY = 'simulador.practica_activa';
const PRACTICAS_KEY = 'simulador.practicas_estudiante';

@Injectable({ providedIn: 'root' })
export class EstudianteSessionService {
  private readonly _practicas = signal<PracticaEstudianteRegistro[]>(this.cargarPracticas());
  private readonly _sesionActiva = signal(!!localStorage.getItem(ACCESS_KEY));
  private readonly _practicaActivaId = signal<number | null>(this.leerPracticaActivaId());

  readonly practicas = this._practicas.asReadonly();

  readonly practicaActiva = computed(() => {
    this._practicaActivaId();
    const raw = localStorage.getItem(PRACTICA_ACTIVA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PracticaEstudianteActiva;
    } catch {
      return null;
    }
  });

  readonly autenticado = computed(() => this._sesionActiva());

  readonly nombreEstudiante = computed(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return 'Estudiante';
    try {
      const u = JSON.parse(raw) as { nombre_completo?: string; email?: string };
      return u.nombre_completo || u.email || 'Estudiante';
    } catch {
      return 'Estudiante';
    }
  });

  /** Id del estudiante autenticado (localStorage), para claves por usuario. */
  estudianteId(): number | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as { id?: number };
      return typeof u.id === 'number' ? u.id : null;
    } catch {
      return null;
    }
  }

  registrarAcceso(respuesta: AccesoEstudianteRespuesta): void {
    localStorage.setItem(ACCESS_KEY, respuesta.access);
    localStorage.setItem(REFRESH_KEY, respuesta.refresh);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: respuesta.estudiante.id,
        username: respuesta.estudiante.correo,
        email: respuesta.estudiante.correo,
        nombre_completo: respuesta.estudiante.nombre_completo,
        rol: 'Estudiante',
      }),
    );

    const practica: PracticaEstudianteActiva = {
      ...respuesta.practica,
      autorizacion_id: respuesta.autorizacion_id,
    };
    localStorage.setItem(PRACTICA_ACTIVA_KEY, JSON.stringify(practica));
    this._sesionActiva.set(true);
    this._practicaActivaId.set(practica.id);
    this.upsertPractica(practica, respuesta.autorizacion_id);
  }

  obtenerPractica(id: number): PracticaEstudianteRegistro | undefined {
    return this._practicas().find((p) => p.id === id);
  }

  seleccionarPractica(id: number): void {
    const practica = this.obtenerPractica(id);
    if (!practica) return;
    localStorage.setItem(PRACTICA_ACTIVA_KEY, JSON.stringify(practica));
    this._practicaActivaId.set(id);
  }

  guardarProgreso(
    practicaId: number,
    datos: {
      conversacionesCompletadas: number;
      conversacionesTotales: number;
      resultadoId?: number;
    },
  ): void {
    const lista = [...this._practicas()];
    const idx = lista.findIndex((p) => p.id === practicaId);
    if (idx < 0) return;

    const practica = lista[idx];
    const casoNarrativoId = resolverCasoNarrativoId(practica);
    const porcentaje =
      datos.conversacionesTotales > 0
        ? Math.round((datos.conversacionesCompletadas / datos.conversacionesTotales) * 100)
        : practica.progreso.porcentaje;

    let estado: EstadoPracticaEstudiante = 'en_progreso';
    if (datos.resultadoId) {
      estado = 'completada';
    } else if (porcentaje === 0) {
      estado = 'no_iniciada';
    }

    const progreso: ProgresoPracticaLocal = {
      practicaId,
      casoNarrativoId,
      porcentaje,
      estado,
      ultimaActividad: new Date().toISOString(),
      conversacionesCompletadas: datos.conversacionesCompletadas,
      conversacionesTotales: datos.conversacionesTotales,
      resultadoId: datos.resultadoId ?? practica.progreso.resultadoId,
    };

    lista[idx] = { ...practica, progreso };
    this.persistirPracticas(lista);
  }

  marcarEnProgreso(practicaId: number): void {
    const practica = this.obtenerPractica(practicaId);
    if (!practica || practica.progreso.estado === 'completada') return;
    this.guardarProgreso(practicaId, {
      conversacionesCompletadas: practica.progreso.conversacionesCompletadas,
      conversacionesTotales: practica.progreso.conversacionesTotales,
    });
  }

  /** Restablece progreso local tras aprobación de reintento o reinicio docente. */
  reiniciarProgresoLocal(practicaId: number): void {
    const practica = this.obtenerPractica(practicaId);
    if (!practica) return;

    const casoNarrativoId = resolverCasoNarrativoId(practica);
    const estudianteId = this.estudianteId();
    if (estudianteId != null) {
      borrarPartidaPersistida({
        casoId: casoNarrativoId,
        estudianteId,
        practicaId,
      });
      for (const clave of clavesIntroRelacionadas(casoNarrativoId, estudianteId, practicaId)) {
        localStorage.removeItem(clave);
      }
    }

    const lista = [...this._practicas()];
    const idx = lista.findIndex((p) => p.id === practicaId);
    if (idx < 0) return;

    lista[idx] = {
      ...lista[idx],
      progreso: {
        practicaId,
        casoNarrativoId,
        porcentaje: 0,
        estado: 'no_iniciada',
        ultimaActividad: new Date().toISOString(),
        conversacionesCompletadas: 0,
        conversacionesTotales: 0,
      },
    };
    this.persistirPracticas(lista);
  }

  cerrarSesion(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PRACTICA_ACTIVA_KEY);
    this._sesionActiva.set(false);
    this._practicaActivaId.set(null);
  }

  private leerPracticaActivaId(): number | null {
    const raw = localStorage.getItem(PRACTICA_ACTIVA_KEY);
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as { id?: number };
      return typeof p.id === 'number' ? p.id : null;
    } catch {
      return null;
    }
  }

  private upsertPractica(practica: PracticaEstudianteActiva, autorizacionId: number): void {
    const lista = [...this._practicas()];
    const idx = lista.findIndex((p) => p.id === practica.id);
    const casoNarrativoId = resolverCasoNarrativoId(practica);

    if (idx >= 0) {
      lista[idx] = {
        ...lista[idx],
        ...practica,
        autorizacion_id: autorizacionId,
      };
    } else {
      lista.push({
        ...practica,
        autorizacion_id: autorizacionId,
        progreso: {
          practicaId: practica.id,
          casoNarrativoId,
          porcentaje: 0,
          estado: 'no_iniciada',
          ultimaActividad: practica.fecha_inicio,
          conversacionesCompletadas: 0,
          conversacionesTotales: 0,
        },
      });
    }

    this.persistirPracticas(lista);
  }

  private cargarPracticas(): PracticaEstudianteRegistro[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(PRACTICAS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PracticaEstudianteRegistro[];
    } catch {
      return [];
    }
  }

  private persistirPracticas(lista: PracticaEstudianteRegistro[]): void {
    this._practicas.set(lista);
    localStorage.setItem(PRACTICAS_KEY, JSON.stringify(lista));
  }
}
