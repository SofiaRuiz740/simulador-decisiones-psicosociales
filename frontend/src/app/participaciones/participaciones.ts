import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CasoDetalle, RecursoMultimedia } from '../core/models/casos.model';
import { SeguimientoParticipacion } from '../core/models/practicas.model';
import { CasosService } from '../core/services/casos.service';
import { SimulacionService } from '../core/services/simulacion.service';
import { NarrativaFacadeService } from '../core/simulacion-narrativa/services/narrativa-facade.service';
import { resolverFaseIntro } from '../core/simulacion-narrativa/utils/introduccion-narrativa.util';
import { obtenerCatalogoCaso, resolverCasoNarrativoId } from '../core/utils/caso-narrativo.util';
import { ExploracionVisualComponent } from '../estudiante/exploracion-visual/exploracion-visual';
import { IntroduccionNarrativaComponent } from '../estudiante/exploracion-visual/introduccion-narrativa/introduccion-narrativa';
import { SimulacionPresentacionPreviewComponent } from '../shared/components/simulacion-presentacion-preview/simulacion-presentacion-preview';

@Component({
  selector: 'app-participaciones',
  imports: [
    CommonModule,
    MatProgressBarModule,
    ExploracionVisualComponent,
    IntroduccionNarrativaComponent,
    SimulacionPresentacionPreviewComponent,
  ],
  templateUrl: './participaciones.html',
  styleUrl: './participaciones.scss',
})
export class Participaciones implements OnInit {
  private readonly servicio = inject(SimulacionService);
  private readonly casos = inject(CasosService);
  private readonly facade = inject(NarrativaFacadeService);

  readonly tab = signal<'seguimiento' | 'simulacion'>('seguimiento');
  readonly loading = signal(true);
  readonly filas = signal<SeguimientoParticipacion[]>([]);
  readonly metricas = signal({
    autorizados: 0,
    en_curso: 0,
    finalizados: 0,
    pendientes: 0,
  });

  /** Fila seleccionada para previsualizar el caso real. */
  readonly seleccionada = signal<SeguimientoParticipacion | null>(null);
  /** Caso completo (escenarios + preguntas + respuestas) de la selección. */
  readonly casoSeleccionado = signal<CasoDetalle | null>(null);
  /** Loading específico para el caso del preview. */
  readonly cargandoCaso = signal(false);

  /** Fase de la vista previa visual narrativa (intro/simulación). */
  readonly fasePreviewVisual = signal<'cargando' | 'intro' | 'simulacion' | null>(null);

  /** Identificador del caso narrativo visual (slug) para la fila seleccionada, si existe. */
  readonly casoNarrativoId = computed<string>(() => {
    const f = this.seleccionada();
    if (!f) return '';
    return resolverCasoNarrativoId({ caso_id: f.caso_id, caso_nombre: f.caso_nombre } as any);
  });

  /** Indica si la fila seleccionada tiene una simulación narrativa visual disponible. */
  readonly previewVisualDisponible = computed<boolean>(() => {
    const slug = this.casoNarrativoId();
    if (!slug) return false;
    return !!obtenerCatalogoCaso(slug)?.disponible;
  });

  readonly tabs = [
    { id: 'seguimiento' as const, label: 'Seguimiento docente' },
    { id: 'simulacion' as const, label: 'Vista previa simulación' },
  ];

  readonly columnasSeguimiento = [
    'Estudiante', 'Práctica', 'Caso', 'Estado', 'Progreso', 'Tiempo',
    'Restante', 'Intentos', 'Resp.',
  ];

  readonly resumenSeleccion = computed(() => {
    const f = this.seleccionada();
    const c = this.casoSeleccionado();
    if (!f || !c) return null;
    return {
      estudiante: f.estudiante_nombre,
      practica: f.practica_nombre,
      escenarios: c.escenarios.length,
      preguntas: c.escenarios.reduce((acc, e) => acc + e.preguntas.length, 0),
    };
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.servicio.metricasSeguimiento().subscribe({
      next: (m) => this.metricas.set(m),
      error: () => this.metricas.set({ autorizados: 0, en_curso: 0, finalizados: 0, pendientes: 0 }),
    });
    this.servicio.listarSeguimiento().subscribe({
      next: (rows) => {
        this.filas.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.filas.set([]);
        this.loading.set(false);
      },
    });
  }

  /** El docente hace click en "Detalle": selecciona la fila y carga el caso real. */
  verDetalle(fila: SeguimientoParticipacion): void {
    this.seleccionada.set(fila);
    this.tab.set('simulacion');
    this.fasePreviewVisual.set(null);

    const casoNarrativo = resolverCasoNarrativoId({
      caso_id: fila.caso_id,
      caso_nombre: fila.caso_nombre,
    } as any);

    if (casoNarrativo && obtenerCatalogoCaso(casoNarrativo)?.disponible) {
      // Caso con simulación narrativa visual: mostramos la experiencia real
      // del estudiante (personajes, advertencias, escenarios, diálogos) en
      // modo solo lectura, sin afectar el progreso del estudiante.
      this.fasePreviewVisual.set('cargando');
      this.facade.establecerContextoPersistencia({
        casoId: casoNarrativo,
        estudianteId: null,
        practicaId: null,
      });
      this.facade.iniciarCaso(casoNarrativo).subscribe({
        next: () => {
          const fase = resolverFaseIntro(casoNarrativo, null, null);
          this.fasePreviewVisual.set(fase === 'intro' ? 'intro' : 'simulacion');
        },
        error: () => {
          this.fasePreviewVisual.set(null);
        },
      });
      this.casoSeleccionado.set(null);
      return;
    }

    if (!fila.caso_id) {
      this.casoSeleccionado.set(null);
      return;
    }
    this.cargandoCaso.set(true);
    this.casos.obtenerCaso(fila.caso_id).subscribe({
      next: (c) => {
        this.casoSeleccionado.set(c);
        this.cargandoCaso.set(false);
      },
      error: () => {
        this.casoSeleccionado.set(null);
        this.cargandoCaso.set(false);
      },
    });
  }

  /** Avanza de la introducción narrativa a la simulación dentro de la vista previa. */
  onIntroduccionCompletaPreview(): void {
    this.fasePreviewVisual.set('simulacion');
  }

  onSinIntroduccionPreview(): void {
    this.fasePreviewVisual.set('simulacion');
  }

  limpiarSeleccion(): void {
    this.seleccionada.set(null);
    this.casoSeleccionado.set(null);
    this.fasePreviewVisual.set(null);
  }

  /** Recursos normalizados (mismo helper que en simulación del estudiante). */
  recursosVisibles(recursos: (RecursoMultimedia | string)[] | undefined | null): RecursoMultimedia[] {
    return (recursos || []).map((r) => typeof r === 'string'
      ? { tipo: 'imagen' as const, url: r }
      : r,
    ).filter((r) => !!r.url?.trim());
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'EN_CURSO': return 'badge badge--en-curso';
      case 'FINALIZADA': return 'badge badge--finalizado';
      case 'INCOMPLETA': return 'badge badge--pendiente';
      case 'NO_INICIADA': return 'badge badge--sin-iniciar';
      default: return 'badge';
    }
  }

  formatoTiempo(seg: number): string {
    if (!seg) return '—';
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
