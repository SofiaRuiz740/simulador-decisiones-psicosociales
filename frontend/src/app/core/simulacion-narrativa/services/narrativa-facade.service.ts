import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';

import {
  CasoCatalogo,
  CasoNarrativoCompleto,
  EstadoContradiccionInstancia,
  LibretaPsicologo,
  MetricasPersonaje,
  ResumenPedagogico,
  SoporteHipotesis,
} from '../models';
import { CasoNarrativoLoaderService } from './caso-narrativo-loader.service';
import { LibretaService } from './libreta.service';
import { NarrativaDataService } from './narrativa-data.service';
import { NarrativaEngineService } from './narrativa-engine.service';
import { NarrativaPersistenciaService } from './narrativa-persistencia.service';
import { NarrativaStateService } from './narrativa-state.service';
import { TrazabilidadService } from './trazabilidad.service';

/**
 * Fachada de alto nivel que orquesta carga, estado y motor narrativo.
 * Las competencias ocultas NO se exponen aquí para la UI del estudiante.
 */
@Injectable({ providedIn: 'root' })
export class NarrativaFacadeService {
  private readonly data = inject(NarrativaDataService);
  private readonly loader = inject(CasoNarrativoLoaderService);
  private readonly state = inject(NarrativaStateService);
  private readonly engine = inject(NarrativaEngineService);
  private readonly trazabilidad = inject(TrazabilidadService);
  private readonly libretaService = inject(LibretaService);
  private readonly persistencia = inject(NarrativaPersistenciaService);

  readonly caso = this.state.caso;
  readonly estado = this.state.estado;
  readonly escenarioResuelto = this.state.escenarioResuelto;
  readonly escenarioActual = this.state.escenarioActual;
  readonly tiempoNarrativo = this.state.tiempoNarrativo;
  readonly tiempoNarrativoFormateado = this.state.tiempoNarrativoFormateado;
  readonly eventosActivados = this.state.eventosActivados;
  readonly objetivosCumplidosInternos = this.state.objetivosCumplidos;
  readonly evidenciasVisibles = this.state.evidenciasVisibles;
  readonly contradiccionesPosibles = this.state.contradiccionesPosibles;
  readonly contradiccionesDetectadas = this.state.contradiccionesDetectadas;
  readonly contradiccionesActivas = this.state.contradiccionesActivas;
  readonly libreta = this.state.libreta;
  readonly trazabilidadDocente = this.state.trazabilidad;
  readonly cargando = this.state.cargando;
  readonly error = this.state.error;

  listarCasosDisponibles(): Observable<CasoCatalogo> {
    return this.data.cargarCatalogo();
  }

  iniciarCaso(casoId: string): Observable<CasoNarrativoCompleto> {
    this.state.establecerCargando(true);
    this.state.establecerError(null);

    return this.loader.cargarCaso(casoId).pipe(
      tap((caso) => {
        const partidaGuardada = this.persistencia.cargarPartidaGuardada(casoId);
        this.engine.prepararSesion(caso, partidaGuardada);
      }),
      catchError((err) => {
        const detalle = err?.message ?? err?.statusText ?? 'Error desconocido al cargar el caso.';
        this.state.establecerError(
          `No se pudo cargar la información de la práctica (${detalle}). Intenta recargar la página.`,
        );
        return throwError(() => err);
      }),
      finalize(() => this.state.establecerCargando(false)),
    );
  }

  establecerContextoPersistencia(contexto: {
    casoId: string;
    estudianteId: number | null;
    practicaId: number | null;
  }): void {
    this.persistencia.establecerContexto(contexto);
  }

  persistirPartida(escenaVisualId: string | null = null): void {
    const estado = this.state.estado();
    if (!estado) return;
    this.persistencia.guardarPartida(estado, escenaVisualId);
  }

  consumirEscenaVisualRestaurada(): string | null {
    return this.persistencia.consumirEscenaVisualRestaurada();
  }

  reiniciar(): void {
    this.state.reiniciar();
  }

  // Escenarios y entidades
  escenariosDisponibles = () => this.engine.escenariosDisponibles();
  obtenerEscenarioResuelto = (id?: string) => this.engine.obtenerEscenarioResuelto(id);
  conversacionesDisponibles = () => this.engine.conversacionesDisponibles();
  evidenciasDescubribles = () => this.engine.evidenciasDescubribles();
  hipotesisFormulables = () => this.engine.hipotesisFormulables();
  intervencionesDisponibles = () => this.engine.intervencionesDisponibles();
  transicionesDisponibles = () => this.engine.transicionesDisponibles();
  establecerEscenarioNarrativo = (id: string) => this.engine.establecerEscenarioNarrativo(id);

  // Conversaciones
  nodoConversacionActual = (id: string) => this.engine.nodoConversacionActual(id);
  opcionesDisponibles = (id: string) => this.engine.opcionesDisponibles(id);
  iniciarConversacion = (id: string) => this.engine.iniciarConversacion(id);
  seleccionarOpcionDialogo = (conversacionId: string, opcionId: string) =>
    this.engine.seleccionarOpcionDialogo(conversacionId, opcionId);
  avanzarConversacionAutomatica = (id: string) => this.engine.avanzarConversacionAutomatica(id);
  finalizarConversacionActiva = (id: string) => this.engine.finalizarConversacionActiva(id);
  estaConversacionBloqueadaPorFatiga = (id: string) =>
    this.engine.estaConversacionBloqueadaPorFatiga(id);
  estaConversacionEnModoFatiga = (id: string) => this.engine.estaConversacionEnModoFatiga(id);
  activarModoAgotamientoConversacion = (id: string) =>
    this.engine.activarModoAgotamientoConversacion(id);
  conversacionPermiteReintentoAgotamiento = (id: string) =>
    this.engine.conversacionPermiteReintentoAgotamiento(id);

  // Métricas psicosociales (visibles al estudiante como parte de la relación clínica)
  obtenerMetricasPersonaje = (personajeId: string): MetricasPersonaje | undefined =>
    this.engine.obtenerMetricasPersonaje(personajeId);
  conversacionesRestantesPersonaje = (personajeId: string) =>
    this.engine.conversacionesRestantesPersonaje(personajeId);

  // Acciones clínicas
  descubrirEvidencia = (id: string) => this.engine.descubrirEvidencia(id);
  formularHipotesis = (id: string, soportes: SoporteHipotesis[]) =>
    this.engine.formularHipotesis(id, soportes);
  analizarContradiccion = (id: string) => this.engine.analizarContradiccion(id);
  identificarContradiccion = (id: string) => this.engine.identificarContradiccion(id);
  actualizarEstadoContradiccion = (
    instanciaId: string,
    estado: EstadoContradiccionInstancia,
  ) => this.engine.actualizarEstadoContradiccion(instanciaId, estado);
  aplicarIntervencion = (id: string) => this.engine.aplicarIntervencion(id);
  transicionarEscenario = (id: string) => this.engine.transicionarEscenario(id);

  eventosRecientes = () => this.engine.eventosRecientes();
  objetivosCumplidos = () => this.engine.objetivosCumplidos();

  /** Resumen pedagógico sin competencias ocultas. */
  generarResumenPedagogico(): ResumenPedagogico | null {
    return this.engine.generarResumenPedagogico();
  }

  /**
   * Informe completo para docentes (competencias + trazabilidad + métricas).
   * No usar en la UI del estudiante durante la simulación.
   */
  generarInformePedagogicoDocente() {
    return this.engine.generarInformePedagogicoDocente();
  }

  obtenerCompetenciasDocente() {
    return this.state.estado()?.competencias ?? null;
  }

  obtenerTrazabilidadCompleta() {
    const estado = this.state.estado();
    return estado ? this.trazabilidad.obtenerTrazabilidad(estado) : null;
  }

  agregarNotaLibreta = (
    contenido: string,
    vinculos?: LibretaPsicologo['notasEstudiante'][number]['vinculos'],
  ) => {
    const nota = this.libretaService.agregarNota(contenido, vinculos);
    if (nota) this.persistirPartida(null);
    return nota;
  };

  eliminarNotaLibreta = (notaId: string) => {
    const ok = this.libretaService.eliminarNota(notaId);
    if (ok) this.persistirPartida(null);
    return ok;
  };
}
