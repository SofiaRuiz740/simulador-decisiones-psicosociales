import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EstudianteSessionService } from '../../core/services/estudiante-session.service';
import { PracticasService } from '../../core/services/practicas.service';
import {
  obtenerCatalogoCaso,
  resolverCasoNarrativoId,
  subtituloCasoParaPractica,
} from '../../core/utils/caso-narrativo.util';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

@Component({
  selector: 'app-practica-info',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    EstudianteShellComponent,
  ],
  templateUrl: './practica-info.html',
  styleUrl: './practica-info.scss',
})
export class PracticaInfoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(EstudianteSessionService);
  private readonly practicasApi = inject(PracticasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly practica = signal(this.session.obtenerPractica(0));
  readonly solicitudPendiente = signal(false);
  readonly solicitando = signal(false);
  readonly reintentoAutorizado = signal(false);

  readonly casoNarrativoId = computed(() => {
    const p = this.practica();
    return p ? resolverCasoNarrativoId(p) : '';
  });

  readonly subtituloCaso = computed(() => {
    const p = this.practica();
    if (!p) return '';
    return subtituloCasoParaPractica(p, this.casoNarrativoId());
  });

  readonly catalogo = computed(() => obtenerCatalogoCaso(this.casoNarrativoId()));

  readonly puedeIniciar = computed(() => {
    const p = this.practica();
    if (!p) return false;
    if (p.progreso.estado === 'completada' && !this.reintentoAutorizado()) return false;
    return this.catalogo()?.disponible ?? true;
  });

  readonly practicaCompletada = computed(
    () => this.practica()?.progreso.estado === 'completada',
  );

  readonly puedeSolicitarReintento = computed(
    () => this.practicaCompletada() && !this.solicitudPendiente() && !this.reintentoAutorizado(),
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('practicaId'));
    const practica = this.session.obtenerPractica(id);
    if (!practica) {
      this.router.navigate(['/estudiante/panel']);
      return;
    }
    this.session.seleccionarPractica(id);
    this.practica.set(practica);
    this.sincronizarEstadoAcademico(practica);
  }

  private sincronizarEstadoAcademico(practica: NonNullable<ReturnType<typeof this.session.obtenerPractica>>): void {
    this.practicasApi.estadoAutorizacion(practica.autorizacion_id).subscribe({
      next: (estado) => {
        this.reintentoAutorizado.set(estado.reintento_autorizado);
        if (estado.reintento_autorizado && estado.ultimo_reinicio_en) {
          const claveReinicio = `simulador.reinicio_aplicado:${practica.autorizacion_id}`;
          if (localStorage.getItem(claveReinicio) !== estado.ultimo_reinicio_en) {
            this.session.reiniciarProgresoLocal(practica.id);
            localStorage.setItem(claveReinicio, estado.ultimo_reinicio_en);
            this.practica.set(this.session.obtenerPractica(practica.id));
          }
        } else if (estado.reintento_autorizado && practica.progreso.estado === 'completada') {
          this.session.reiniciarProgresoLocal(practica.id);
          this.practica.set(this.session.obtenerPractica(practica.id));
        }
      },
    });

    this.practicasApi.listarSolicitudesReapertura().subscribe({
      next: (sols) => {
        const pendiente = sols.some(
          (s) => s.autorizacion_id === practica.autorizacion_id && s.estado === 'PENDIENTE',
        );
        this.solicitudPendiente.set(pendiente);
      },
    });
  }

  etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En progreso';
      default:
        return 'Sin iniciar';
    }
  }

  iniciarSimulacion(): void {
    const p = this.practica();
    if (!p || !this.puedeIniciar()) return;
    this.router.navigate(['/estudiante/practicas', p.id, 'simulacion']);
  }

  solicitarNuevoIntento(): void {
    const p = this.practica();
    if (!p || !this.puedeSolicitarReintento()) return;

    this.solicitando.set(true);
    this.practicasApi.solicitarReapertura(p.autorizacion_id).subscribe({
      next: () => {
        this.solicitudPendiente.set(true);
        this.solicitando.set(false);
        this.snackBar.open('Solicitud enviada al docente.', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.solicitando.set(false);
        const msg = err?.error?.non_field_errors?.[0] ?? err?.error?.detail ?? 'No se pudo enviar la solicitud.';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }
}
