import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SeguimientoParticipacion } from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';

@Component({
  selector: 'app-participaciones',
  imports: [CommonModule, MatProgressBarModule],
  templateUrl: './participaciones.html',
  styleUrl: './participaciones.scss',
})
export class Participaciones implements OnInit {
  private readonly servicio = inject(SimulacionService);

  readonly tab = signal<'seguimiento' | 'simulacion'>('seguimiento');
  readonly loading = signal(true);
  readonly filas = signal<SeguimientoParticipacion[]>([]);
  readonly metricas = signal({
    autorizados: 0,
    en_curso: 0,
    finalizados: 0,
    pendientes: 0,
  });

  readonly tabs = [
    { id: 'seguimiento' as const, label: 'Seguimiento docente' },
    { id: 'simulacion' as const, label: 'Vista previa simulación' },
  ];

  readonly columnasSeguimiento = [
    'Estudiante', 'Práctica', 'Caso', 'Estado', 'Progreso', 'Tiempo',
    'Restante', 'Intentos', 'Resp.',
  ];

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
