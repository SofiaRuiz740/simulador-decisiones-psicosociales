import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/academico.model';
import {
  MetricasParticipacion,
  Participacion,
  ProgresoParticipacion,
  Resultado,
  SeguimientoParticipacion,
} from '../models/practicas.model';

@Injectable({ providedIn: 'root' })
export class SimulacionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  iniciarParticipacion(autorizacionId?: number) {
    const body = autorizacionId ? { autorizacion_id: autorizacionId } : {};
    return this.http.post<Participacion>(`${this.api}/participaciones/iniciar/`, body);
  }
  obtenerParticipacion(id: number) {
    return this.http.get<Participacion>(`${this.api}/participaciones/${id}/`);
  }
  responder(id: number, pregunta_id: number, respuesta_id: number) {
    return this.http.post<{ detail: string }>(
      `${this.api}/participaciones/${id}/responder/`,
      { pregunta_id, respuesta_id },
    );
  }
  finalizar(id: number) {
    return this.http.post<{ detail: string; resultado_id: number }>(
      `${this.api}/participaciones/${id}/finalizar/`, {},
    );
  }
  progreso(id: number) {
    return this.http.get<ProgresoParticipacion>(`${this.api}/participaciones/${id}/progreso/`);
  }

  listarSeguimiento(params?: { practica?: number; estado?: string }) {
    const q = new URLSearchParams();
    if (params?.practica) q.set('practica', String(params.practica));
    if (params?.estado) q.set('estado', params.estado);
    const qs = q.toString();
    const url = qs ? `${this.api}/participaciones/?${qs}` : `${this.api}/participaciones/`;
    return this.http.get<SeguimientoParticipacion[]>(url);
  }

  metricasSeguimiento() {
    return this.http.get<MetricasParticipacion>(`${this.api}/participaciones/metricas/`);
  }

  // Resultados
  listarResultados(page = 1) {
    return this.http.get<Paginated<Resultado>>(`${this.api}/resultados/?page=${page}`);
  }
  obtenerResultado(id: number) {
    // Devuelve detalle_preguntas + competencias (req. adicionales 5 y 6)
    // sin necesidad de un endpoint extra.
    return this.http.get<Resultado>(`${this.api}/resultados/${id}/`);
  }
  guardarFeedback(id: number, feedback_docente: string) {
    return this.http.post<Resultado>(
      `${this.api}/resultados/${id}/feedback-docente/`,
      { feedback_docente },
    );
  }
}
