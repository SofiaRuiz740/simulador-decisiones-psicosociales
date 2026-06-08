import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CasoCatalogo,
  CasoManifest,
  Contradiccion,
  Conversacion,
  Escenario,
  EventoSimulacion,
  Evidencia,
  Hipotesis,
  IntervencionPsicologica,
  ObjetivoNarrativo,
  Personaje,
} from '../models';

/** Rutas base para los datos JSON de la simulación narrativa. */
export const RUTAS_SIMULACION_NARRATIVA = {
  catalogo: `${environment.simulacionNarrativaDataUrl}/catalogo.json`,
  casoBase: (casoId: string) => `${environment.simulacionNarrativaDataUrl}/casos/${casoId}`,
} as const;

@Injectable({ providedIn: 'root' })
export class NarrativaDataService {
  private readonly http = inject(HttpClient);

  cargarCatalogo(): Observable<CasoCatalogo> {
    return this.http.get<CasoCatalogo>(RUTAS_SIMULACION_NARRATIVA.catalogo);
  }

  cargarManifest(casoId: string): Observable<CasoManifest> {
    return this.http.get<CasoManifest>(
      `${RUTAS_SIMULACION_NARRATIVA.casoBase(casoId)}/manifest.json`,
    );
  }

  cargarEntidad<T>(casoId: string, rutaRelativa: string): Observable<T> {
    return this.http.get<T>(`${RUTAS_SIMULACION_NARRATIVA.casoBase(casoId)}/${rutaRelativa}`);
  }

  cargarEscenarios(casoId: string, rutas: string[]): Observable<Escenario[]> {
    return this.cargarEntidades<Escenario>(casoId, rutas);
  }

  cargarPersonajes(casoId: string, rutas: string[]): Observable<Personaje[]> {
    return this.cargarEntidades<Personaje>(casoId, rutas);
  }

  cargarConversaciones(casoId: string, rutas: string[]): Observable<Conversacion[]> {
    return this.cargarEntidades<Conversacion>(casoId, rutas);
  }

  cargarEvidencias(casoId: string, rutas: string[]): Observable<Evidencia[]> {
    return this.cargarEntidades<Evidencia>(casoId, rutas);
  }

  cargarContradicciones(casoId: string, rutas: string[]): Observable<Contradiccion[]> {
    return this.cargarEntidades<Contradiccion>(casoId, rutas);
  }

  cargarHipotesis(casoId: string, rutas: string[]): Observable<Hipotesis[]> {
    return this.cargarEntidades<Hipotesis>(casoId, rutas);
  }

  cargarIntervenciones(casoId: string, rutas: string[]): Observable<IntervencionPsicologica[]> {
    return this.cargarEntidades<IntervencionPsicologica>(casoId, rutas);
  }

  cargarEventos(casoId: string, rutas: string[]): Observable<EventoSimulacion[]> {
    return this.cargarEntidades<EventoSimulacion>(casoId, rutas);
  }

  cargarObjetivos(casoId: string, rutas: string[]): Observable<ObjetivoNarrativo[]> {
    return this.cargarEntidades<ObjetivoNarrativo>(casoId, rutas);
  }

  private cargarEntidades<T>(casoId: string, rutas: string[]): Observable<T[]> {
    if (!rutas.length) return of([]);
    return forkJoin(rutas.map((ruta) => this.cargarEntidad<T>(casoId, ruta)));
  }
}
