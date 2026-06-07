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
    correo_smtp_password?: string,
  ) {
    const body: Record<string, unknown> = { estudiante_ids, grupo_ids };
    if (correo_smtp_password) body['correo_smtp_password'] = correo_smtp_password;
    return this.http.post<{
      creadas: number;
      correos_enviados: number;
      correos_fallidos: number;
      autorizaciones: unknown[];
    }>(`${this.api}/practicas/${id}/autorizar-estudiantes/`, body);
  }

  reenviarInvitacion(practicaId: number, autorizacionId: number, correo_smtp_password?: string) {
    const body: Record<string, string> = {};
    if (correo_smtp_password) body['correo_smtp_password'] = correo_smtp_password;
    return this.http.post<unknown>(
      `${this.api}/practicas/${practicaId}/reenviar-invitacion/${autorizacionId}/`,
      body,
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
}
