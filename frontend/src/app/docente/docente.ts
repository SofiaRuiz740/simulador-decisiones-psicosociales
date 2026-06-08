import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { EventoActividad, ExtrasService } from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';
import { EstadoPractica, Practica } from '../core/models/practicas.model';

interface AccesoRapido {
  titulo: string;
  ruta: string;
}

@Component({
  selector: 'app-docente',
  imports: [CommonModule, DatePipe, RouterLink, MatProgressBarModule],
  templateUrl: './docente.html',
  styleUrl: './docente.scss',
})
export class Docente implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly practicasSrv = inject(PracticasService);
  private readonly extras = inject(ExtrasService);

  readonly loading = signal(true);

  readonly nombreCorto = computed(() => {
    const u = this.auth.usuario();
    const full = u?.nombre_completo || u?.first_name || u?.username || 'docente';
    const parts = full.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(-2).join(' ') : full;
  });

  readonly estudiantesCount = signal<number | null>(null);
  readonly casosCount = signal<number | null>(null);
  readonly practicasActivas = signal<number | null>(null);
  readonly feedbackPendiente = signal<number | null>(null);
  readonly actividad = signal<EventoActividad[]>([]);
  readonly proximasPracticas = signal<Practica[]>([]);

  readonly accesos: AccesoRapido[] = [
    { titulo: 'Crear caso', ruta: '/casos' },
    { titulo: 'Generar con IA', ruta: '/ia-generativa' },
    { titulo: 'Importar', ruta: '/importacion-documentos' },
    { titulo: 'Agendar práctica', ruta: '/practicas' },
    { titulo: 'Resultados', ruta: '/resultados' },
  ];

  ngOnInit(): void {
    forkJoin({
      metricas: this.extras.docenteMetricas(),
      actividad: this.extras.docenteActividad(4),
      practicas: this.practicasSrv.listar(),
    }).subscribe({
      next: ({ metricas, actividad, practicas }) => {
        this.estudiantesCount.set(metricas.estudiantes);
        this.casosCount.set(metricas.casos);
        this.practicasActivas.set(metricas.practicas_activas);
        this.feedbackPendiente.set(metricas.feedback_pendiente);
        this.actividad.set(actividad);

        const proximas = [...practicas.results]
          .filter((p) => p.estado !== EstadoPractica.Cancelada && p.estado !== EstadoPractica.Finalizada)
          .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
          .slice(0, 5);
        this.proximasPracticas.set(proximas);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  activityDotClass(tipo: string): string {
    if (tipo.includes('PRACTICA') || tipo.includes('RESULTADO')) {
      return 'activity-item__dot activity-item__dot--teal';
    }
    return 'activity-item__dot';
  }

  badgeClass(estado: EstadoPractica): string {
    switch (estado) {
      case EstadoPractica.SinIniciar: return 'badge badge--sin-iniciar';
      case EstadoPractica.EnCurso: return 'badge badge--en-curso';
      case EstadoPractica.Finalizada: return 'badge badge--finalizado';
      case EstadoPractica.Cancelada: return 'badge badge--cancelado';
      default: return 'badge';
    }
  }
}
