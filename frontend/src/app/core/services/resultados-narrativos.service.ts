import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { ResultadoNarrativo } from '../models/practicas.model';
import { ResumenPedagogico } from '../simulacion-narrativa/models/trazabilidad.model';

export interface GuardarResultadoNarrativoInput {
  autorizacion_id?: number;
  porcentaje: number;
  entrevistas_realizadas: number;
  entrevistas_totales: number;
  evidencias_encontradas: number;
  contradicciones_detectadas: number;
  hipotesis_formuladas: number;
  estado_final: string;
  resumen_pedagogico: ResumenPedagogico;
}

@Injectable({ providedIn: 'root' })
export class ResultadosNarrativosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/resultados/narrativos`;

  misResultados() {
    return this.http.get<ResultadoNarrativo[]>(`${this.api}/mis-resultados/`);
  }

  listar() {
    return this.http.get<ResultadoNarrativo[]>(`${this.api}/`);
  }

  obtener(id: number) {
    return this.http.get<ResultadoNarrativo>(`${this.api}/${id}/`);
  }

  guardar(datos: GuardarResultadoNarrativoInput) {
    return this.http.post<ResultadoNarrativo>(`${this.api}/guardar/`, datos);
  }
}
