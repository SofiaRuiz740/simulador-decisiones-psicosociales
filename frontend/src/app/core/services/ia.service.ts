import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Paginated } from '../models/academico.model';
import {
  ContenidoIA,
  ConvertirEnCasoResultado,
  EstadoIA,
  GenerarCasoInput,
  PropuestaCasoIA,
} from '../models/ia.model';

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Estado del proveedor (sin exponer la API key). */
  estado() {
    return this.http.get<EstadoIA>(`${this.api}/ia/estado/`);
  }

  /** Genera una propuesta nueva y la persiste en EN_REVISION. */
  generarCaso(input: GenerarCasoInput) {
    return this.http.post<PropuestaCasoIA>(`${this.api}/ia/generar-caso/`, input);
  }

  listarPropuestas() {
    return this.http.get<Paginated<PropuestaCasoIA>>(`${this.api}/ia/propuestas/`);
  }

  obtenerPropuesta(id: number) {
    return this.http.get<PropuestaCasoIA>(`${this.api}/ia/propuestas/${id}/`);
  }

  aprobarPropuesta(id: number) {
    return this.http.post<PropuestaCasoIA>(`${this.api}/ia/propuestas/${id}/aprobar/`, {});
  }

  rechazarPropuesta(id: number, motivo_rechazo = '') {
    return this.http.post<PropuestaCasoIA>(
      `${this.api}/ia/propuestas/${id}/rechazar/`,
      { motivo_rechazo },
    );
  }

  /** Actualiza el contenido editado por el docente. */
  actualizarContenido(id: number, contenido_json: ContenidoIA) {
    return this.http.patch<PropuestaCasoIA>(
      `${this.api}/ia/propuestas/${id}/`,
      { contenido_json },
    );
  }

  convertirEnCaso(id: number) {
    return this.http.post<ConvertirEnCasoResultado>(
      `${this.api}/ia/propuestas/${id}/convertir-en-caso/`,
      {},
    );
  }

  eliminarPropuesta(id: number) {
    return this.http.delete<void>(`${this.api}/ia/propuestas/${id}/`);
  }
}
