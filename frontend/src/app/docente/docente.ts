import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { AcademicoService } from '../core/services/academico.service';
import { CasosService } from '../core/services/casos.service';
import { PracticasService } from '../core/services/practicas.service';
import { EstadoPractica, Practica } from '../core/models/practicas.model';

interface AccesoRapido {
  titulo: string;
  ruta: string;
}

@Component({
  selector: 'app-docente',
  imports: [CommonModule, RouterLink, MatProgressBarModule],
  templateUrl: './docente.html',
  styleUrl: './docente.scss',
})
export class Docente implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly academico = inject(AcademicoService);
  private readonly casosSrv = inject(CasosService);
  private readonly practicasSrv = inject(PracticasService);

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
      estudiantes: this.academico.listarEstudiantes(),
      casos: this.casosSrv.listarCasos(),
      practicas: this.practicasSrv.listar(),
    }).subscribe({
      next: ({ estudiantes, casos, practicas }) => {
        this.estudiantesCount.set(estudiantes.count);
        this.casosCount.set(casos.count);

        const activas = practicas.results.filter(
          (p) => p.estado === EstadoPractica.SinIniciar || p.estado === EstadoPractica.EnCurso,
        );
        this.practicasActivas.set(activas.length);

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
