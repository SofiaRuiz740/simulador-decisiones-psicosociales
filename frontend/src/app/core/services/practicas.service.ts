import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/academico.model';
import {
  AccesoEstudianteRespuesta,
  AutorizacionListItem,
  MisPracticaEstudiante,
  Practica,
  PracticaDetalle,
  PracticaInput,
  RegistroReinicio,
  ResultadoNarrativo,
  SolicitudReapertura,
} from '../models/practicas.model';

@Injectable({ providedIn: 'root' })
export class PracticasService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listar(page = 1) { return this.http.get<Paginated<Practica>>(`${this.api}/practicas/?page=${page}`); }
  obtener(id: number) { return this.http.get<PracticaDetalle>(`${this.api}/practicas/${id}/`); }
  crear(data: PracticaInput) { return this.http.post<Practica>(`${this.api}/practicas/`, data); }
  actualizar(id: number, data: Partial<PracticaInput>) { return this.http.patch<Practica>(`${this.api}/practicas/${id}/`, data); }
  eliminar(id: number) { return this.http.delete<void>(`${this.api}/practicas/${id}/`); }

  autorizarEstudiantes(
    id: number,
    estudiante_ids: number[] = [],
    grupo_ids: number[] = [],
  ) {
    return this.http.post<{
      creadas: number;
      correos_enviados: number;
      correos_fallidos: number;
      autorizaciones: unknown[];
    }>(`${this.api}/practicas/${id}/autorizar-estudiantes/`, { estudiante_ids, grupo_ids });
  }

  reenviarInvitacion(practicaId: number, autorizacionId: number) {
    return this.http.post<unknown>(
      `${this.api}/practicas/${practicaId}/reenviar-invitacion/${autorizacionId}/`,
      {},
    );
  }

  iniciar(id: number) { return this.http.post<PracticaDetalle>(`${this.api}/practicas/${id}/iniciar/`, {}); }
  finalizar(id: number) { return this.http.post<PracticaDetalle>(`${this.api}/practicas/${id}/finalizar/`, {}); }

  autorizarReintento(practicaId: number, autorizacionId: number) {
    return this.http.post<unknown>(
      `${this.api}/practicas/${practicaId}/autorizar-reintento/${autorizacionId}/`,
      {},
    );
  }

  desautorizarEstudiante(
    practicaId: number,
    autorizacionId: number,
    motivo: string,
  ) {
    const body: Record<string, string> = {};
    if (motivo) body['motivo'] = motivo;
    return this.http.post<{
      autorizacion: unknown;
      email_enviado: boolean;
      email_error: string | null;
    }>(
      `${this.api}/practicas/${practicaId}/desautorizar-estudiante/${autorizacionId}/`,
      body,
    );
  }

  misPracticas() {
    return this.http.get<MisPracticaEstudiante[]>(`${this.api}/practicas/mis-practicas/`);
  }

  listarAutorizaciones(practicaId?: number) {
    const url = practicaId
      ? `${this.api}/practicas/autorizaciones/?practica=${practicaId}`
      : `${this.api}/practicas/autorizaciones/`;
    return this.http.get<AutorizacionListItem[]>(url);
  }

  // Acceso publico estudiante
  accesoEstudiante(correo: string, codigo: string) {
    return this.http.post<AccesoEstudianteRespuesta>(`${this.api}/auth/estudiante-acceso/`, { correo, codigo });
  }

  // --- Fase 13: solicitudes de reapertura ---

  listarSolicitudesReapertura() {
    return this.http.get<SolicitudReapertura[]>(`${this.api}/practicas/solicitudes-reapertura/`);
  }

  solicitarReapertura(autorizacionId: number, motivo = '') {
    return this.http.post<SolicitudReapertura>(`${this.api}/practicas/solicitudes-reapertura/`, {
      autorizacion_id: autorizacionId,
      motivo,
    });
  }

  aprobarSolicitudReapertura(id: number) {
    return this.http.post<SolicitudReapertura>(
      `${this.api}/practicas/solicitudes-reapertura/${id}/aprobar/`,
      {},
    );
  }

  rechazarSolicitudReapertura(id: number, mensaje = '') {
    return this.http.post<SolicitudReapertura>(
      `${this.api}/practicas/solicitudes-reapertura/${id}/rechazar/`,
      { mensaje },
    );
  }

  reiniciarEstudiante(practicaId: number, autorizacionId: number, motivo = '') {
    return this.http.post<{ detail: string; reintento_autorizado: boolean }>(
      `${this.api}/practicas/reinicios/${practicaId}/reiniciar-estudiante/`,
      { autorizacion_id: autorizacionId, confirmacion: 'REINICIAR', motivo },
    );
  }

  reiniciarTodos(practicaId: number, motivo = '') {
    return this.http.post<{ detail: string; estudiantes_afectados: number }>(
      `${this.api}/practicas/reinicios/${practicaId}/reiniciar-todos/`,
      { confirmacion: 'REINICIAR TODOS', motivo },
    );
  }

  listarRegistrosReinicio(practicaId?: number) {
    const url = practicaId
      ? `${this.api}/practicas/reinicios/registros/?practica=${practicaId}`
      : `${this.api}/practicas/reinicios/registros/`;
    return this.http.get<RegistroReinicio[]>(url);
  }

  estadoAutorizacion(autorizacionId?: number) {
    const url = autorizacionId
      ? `${this.api}/practicas/reinicios/estado-autorizacion/?autorizacion_id=${autorizacionId}`
      : `${this.api}/practicas/reinicios/estado-autorizacion/`;
    return this.http.get<{
      autorizacion_id: number;
      practica_id: number;
      reintento_autorizado: boolean;
      ultimo_reinicio_en: string | null;
    }>(url);
  }
}
