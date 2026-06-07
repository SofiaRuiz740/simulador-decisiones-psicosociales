import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CasoDetalle, RecursoMultimedia } from '../core/models/casos.model';
import { SeguimientoParticipacion } from '../core/models/practicas.model';
import { CasosService } from '../core/services/casos.service';
import { SimulacionService } from '../core/services/simulacion.service';

@Component({
  selector: 'app-participaciones',
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './participaciones.html',
  styleUrl: './participaciones.scss',
})
export class Participaciones implements OnInit {
  private readonly servicio = inject(SimulacionService);
  private readonly casos = inject(CasosService);

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

  limpiarSeleccion(): void {
    this.seleccionada.set(null);
    this.casoSeleccionado.set(null);
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
