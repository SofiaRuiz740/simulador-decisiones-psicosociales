import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface AdminMetricas {
  docentes: number;
  estudiantes: number;
  grupos: number;
  casos: number;
  practicas: number;
  practicas_por_estado: Record<string, number>;
  resultados: number;
  nota_promedio: number;
}

export interface DocenteAdmin {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nombre_completo: string;
  is_active: boolean;
  date_joined: string;
  casos_count: number;
  practicas_count: number;
  estudiantes_count: number;
  grupos_count: number;
  materias_count: number;
}

export interface EventoActividad {
  tipo: string;
  tipo_display: string;
  titulo: string;
  actor_id: number | null;
  actor_nombre: string;
  fecha: string;
  referencia_tipo: string;
  referencia_id: number;
}

export interface DocenteMetricas {
  casos: number;
  estudiantes: number;
  practicas_activas: number;
  feedback_pendiente: number;
}

export interface ReportesResumen {
  practicas: number;
  con_participantes: number;
  finalizadas: number;
  exportaciones: number;
  sin_feedback: number;
}

export interface CriterioDesempeno {
  criterio_id: number;
  nombre: string;
  porcentaje_promedio: number;
}

export interface NotaRango {
  rango: string;
  cantidad: number;
}

export interface FeedbackPendienteItem {
  resultado_id: number;
  estudiante_nombre: string;
  practica_nombre: string;
  nota_final: number;
  fecha_calculo: string;
}

export interface ReportesAnalitica {
  desempeno_criterios: CriterioDesempeno[];
  distribucion_notas: NotaRango[];
  feedback_pendiente: FeedbackPendienteItem[];
  total_resultados: number;
}

export interface ReportesFiltros {
  desde?: string;
  hasta?: string;
  materia_id?: number;
  grupo_id?: number;
  /** Solo usado por reportes temáticos. */
  estudiante_id?: number;
}

export interface ArchivoFuente {
  id: number;
  archivo: string;
  nombre_original: string;
  tipo: 'PDF' | 'DOCX' | 'TXT';
  texto_extraido: string;
  estado: string;
  estado_display: string;
  docente: number;
  caso: number | null;
  fecha_subida: string;
}

export interface ResultadoImportacion {
  filas_procesadas: number;
  filas_exitosas: number;
  estudiantes_creados: number;
  estudiantes_vinculados: number;
  grupos_creados: number;
  inscripciones: number;
  materias_creadas: number;
  errores: { fila: number | null; mensaje: string }[];
  advertencias: { fila: number | null; mensaje: string }[];
}

export interface ResultadoImportacionRubrica {
  caso_id: number;
  criterios_importados: number;
  rubrica_creada: boolean;
  errores: { fila: number | null; mensaje: string }[];
  advertencias: { fila: number | null; mensaje: string }[];
}

@Injectable({ providedIn: 'root' })
export class ExtrasService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // ---- Admin ----
  adminMetricas() {
    return this.http.get<AdminMetricas>(`${this.api}/reportes/admin/metricas/`);
  }

  adminDocentes() {
    return this.http.get<DocenteAdmin[]>(`${this.api}/reportes/admin/docentes/`);
  }

  adminActividad(limit = 50) {
    return this.http.get<EventoActividad[]>(`${this.api}/reportes/admin/actividad/?limit=${limit}`);
  }

  // ---- Docente / Reportes agregados ----
  docenteMetricas() {
    return this.http.get<DocenteMetricas>(`${this.api}/reportes/docente/metricas/`);
  }

  docenteActividad(limit = 10) {
    return this.http.get<EventoActividad[]>(`${this.api}/reportes/docente/actividad/?limit=${limit}`);
  }

  reportesResumen(filtros: ReportesFiltros = {}) {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.materia_id) params.set('materia_id', String(filtros.materia_id));
    if (filtros.grupo_id) params.set('grupo_id', String(filtros.grupo_id));
    const q = params.toString();
    return this.http.get<ReportesResumen>(`${this.api}/reportes/resumen/${q ? `?${q}` : ''}`);
  }

  reportesAnalitica(filtros: ReportesFiltros = {}) {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.materia_id) params.set('materia_id', String(filtros.materia_id));
    if (filtros.grupo_id) params.set('grupo_id', String(filtros.grupo_id));
    const q = params.toString();
    return this.http.get<ReportesAnalitica>(`${this.api}/reportes/analitica/${q ? `?${q}` : ''}`);
  }

  // ---- Importación ----
  subirArchivo(file: File): Observable<ArchivoFuente> {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.post<ArchivoFuente>(`${this.api}/importacion/`, fd);
  }
  procesarArchivo(id: number) {
    return this.http.post<ArchivoFuente>(`${this.api}/importacion/${id}/procesar/`, {});
  }
  crearCasoDesdeArchivo(id: number, nombre: string, area_psicosocial = '') {
    return this.http.post<{ caso_id: number; archivo: ArchivoFuente }>(
      `${this.api}/importacion/${id}/crear-caso/`,
      { nombre, area_psicosocial },
    );
  }

  importarEstudiantes(file: File) {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.post<ResultadoImportacion>(`${this.api}/importacion/masiva/estudiantes/`, fd);
  }

  importarGrupos(file: File) {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.post<ResultadoImportacion>(`${this.api}/importacion/masiva/grupos/`, fd);
  }

  descargarPlantillaEstudiantes() {
    return this.http.get(`${this.api}/importacion/masiva/plantilla-estudiantes/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  descargarPlantillaGrupos() {
    return this.http.get(`${this.api}/importacion/masiva/plantilla-grupos/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  descargarPlantillaCaso() {
    return this.http.get(`${this.api}/importacion/masiva/plantilla-caso/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  descargarPlantillaRubrica() {
    return this.http.get(`${this.api}/importacion/masiva/plantilla-rubrica/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  descargarGuiaImportacion() {
    return this.http.get(`${this.api}/importacion/masiva/guia-importacion/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
  descargarCasoEjemplo() {
    return this.http.get(`${this.api}/importacion/masiva/caso-ejemplo/`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  /** Valida la respuesta binaria antes de disparar la descarga en el navegador. */
  guardarRespuestaDescarga(response: HttpResponse<Blob>, nombre: string): void {
    const blob = response.body;
    const contentType = response.headers.get('Content-Type') ?? blob?.type ?? '';
    if (!blob?.size) {
      throw new Error('El servidor no devolvió contenido.');
    }
    if (
      contentType.includes('application/json')
      || contentType.includes('text/html')
      || (contentType.includes('text/plain') && blob.size < 512)
    ) {
      throw new Error('No se pudo descargar el archivo. Verifica tu sesión e intenta de nuevo.');
    }
    this.descargarArchivo(blob, nombre);
  }

  private guardarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  descargarArchivo(blob: Blob, nombre: string): void {
    this.guardarBlob(blob, nombre);
  }

  // ---- Reportes (descargas) ----
  descargarReportePracticaPDF(practicaId: number) {
    return this.http.get(`${this.api}/reportes/practica/${practicaId}/pdf/`, { responseType: 'blob' });
  }
  descargarReportePracticaExcel(practicaId: number) {
    return this.http.get(`${this.api}/reportes/practica/${practicaId}/excel/`, { responseType: 'blob' });
  }

  descargarReporteGrupoPDF(grupoId: number) {
    return this.http.get(`${this.api}/reportes/grupo/${grupoId}/pdf/`, { responseType: 'blob' });
  }
  descargarReporteGrupoExcel(grupoId: number) {
    return this.http.get(`${this.api}/reportes/grupo/${grupoId}/excel/`, { responseType: 'blob' });
  }
  descargarReporteMateriaPDF(materiaId: number) {
    return this.http.get(`${this.api}/reportes/materia/${materiaId}/pdf/`, { responseType: 'blob' });
  }
  descargarReporteMateriaExcel(materiaId: number) {
    return this.http.get(`${this.api}/reportes/materia/${materiaId}/excel/`, { responseType: 'blob' });
  }
  descargarReporteEstudiantePDF(estudianteId: number) {
    return this.http.get(`${this.api}/reportes/estudiante/${estudianteId}/pdf/`, { responseType: 'blob' });
  }
  descargarReporteEstudianteExcel(estudianteId: number) {
    return this.http.get(`${this.api}/reportes/estudiante/${estudianteId}/excel/`, { responseType: 'blob' });
  }

  importarRubrica(casoId: number, file: File) {
    const fd = new FormData();
    fd.append('archivo', file);
    return this.http.post<ResultadoImportacionRubrica>(
      `${this.api}/importacion/masiva/importar-rubrica/${casoId}/`,
      fd,
    );
  }

  /**
   * Descarga un reporte temático (P1).
   * tipo: 'participacion' | 'desempeno' | 'respuestas' | 'tiempos' | 'notas' |
   *       'retroalimentaciones' | 'feedback'
   * formato: 'pdf' | 'excel'
   */
  descargarReporteTematico(
    tipo: ReporteTematicoTipo,
    formato: 'pdf' | 'excel',
    filtros: ReportesFiltros = {},
  ) {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.materia_id) params.set('materia_id', String(filtros.materia_id));
    if (filtros.grupo_id) params.set('grupo_id', String(filtros.grupo_id));
    if (filtros.estudiante_id) params.set('estudiante_id', String(filtros.estudiante_id));
    const q = params.toString();
    const url = `${this.api}/reportes/tematico/${tipo}/${formato}/${q ? `?${q}` : ''}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}

export type ReporteTematicoTipo =
  | 'participacion'
  | 'desempeno'
  | 'respuestas'
  | 'tiempos'
  | 'notas'
  | 'retroalimentaciones'
  | 'feedback';
