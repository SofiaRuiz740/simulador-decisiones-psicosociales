import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { Escenario, Pregunta, Respuesta } from '../core/models/casos.model';
import {
  EstadoParticipacion,
  Participacion,
} from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';
import { UxService } from '../core/services/ux.service';

interface PaginaSimulacion {
  tipo: 'intro' | 'escenario';
  escenario?: Escenario;
}

@Component({
  selector: 'app-simulacion',
  imports: [
    CommonModule, RouterLink,
    MatProgressBarModule, MatSnackBarModule,
  ],
  templateUrl: './simulacion.html',
  styleUrl: './simulacion.scss',
  animations: [
    trigger('escena', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px) scale(0.985)' }),
        animate(
          '420ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '220ms ease-in',
          style({ opacity: 0, transform: 'translateY(-12px) scale(0.99)' }),
        ),
      ]),
    ]),
    trigger('staggerEntrada', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(14px)' }),
          stagger(90, [
            animate(
              '360ms cubic-bezier(0.22, 0.61, 0.36, 1)',
              style({ opacity: 1, transform: 'translateY(0)' }),
            ),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class Simulacion implements OnInit, OnDestroy {
  private readonly servicio = inject(SimulacionService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly errorInicio = signal<string | null>(null);
  readonly participacion = signal<Participacion | null>(null);
  readonly paginaIdx = signal(0);
  readonly seleccion = signal(new Map<number, number>()); // pregunta_id -> respuesta_id
  readonly tiempoRestanteSeg = signal<number | null>(null);

  readonly paginas = computed<PaginaSimulacion[]>(() => {
    const p = this.participacion();
    if (!p?.caso) return [];
    return [
      { tipo: 'intro' },
      ...p.caso.escenarios.map((e) => ({ tipo: 'escenario' as const, escenario: e })),
    ];
  });

  readonly esUltimaPagina = computed(() => this.paginaIdx() === this.paginas().length - 1);
  readonly esPrimeraPagina = computed(() => this.paginaIdx() === 0);

  readonly totalEscenarios = computed(() => this.participacion()?.caso?.escenarios.length ?? 0);

  /** Clase de escena aplicada al shell para variar el fondo por escenario. */
  readonly escenaClase = computed(() => {
    const idx = this.paginaIdx();
    if (idx === 0) return 'scene-intro';
    // 5 paletas rotando para dar sensación de cambio narrativo.
    return `scene-${(idx - 1) % 5 + 1}`;
  });

  readonly totalPreguntas = computed(() => {
    const p = this.participacion();
    if (!p?.caso) return 0;
    return p.caso.escenarios.reduce((sum, e) => sum + e.preguntas.length, 0);
  });

  readonly totalRespondidas = computed(() => this.seleccion().size);

  readonly progreso = computed(() => {
    const total = this.totalPreguntas();
    if (total === 0) return 0;
    return Math.round((this.totalRespondidas() / total) * 100);
  });

  private timerInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.servicio.iniciarParticipacion().subscribe({
      next: (p) => {
        this.participacion.set(p);
        this.cargarRespuestasPrevias(p);
        this.iniciarTimer(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.detail || err.error?.non_field_errors?.[0] || 'No se pudo iniciar la práctica.';
        this.errorInicio.set(msg);
      },
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private cargarRespuestasPrevias(p: Participacion) {
    const m = new Map<number, number>();
    for (const rs of p.respuestas_seleccionadas) {
      m.set(rs.pregunta, rs.respuesta_elegida);
    }
    this.seleccion.set(m);
  }

  private iniciarTimer(p: Participacion) {
    const sync = () => {
      this.servicio.progreso(p.id).subscribe({
        next: (prog) => {
          this.tiempoRestanteSeg.set(prog.tiempo_restante_seg);
          if (prog.tiempo_restante_seg <= 0 && prog.estado === 'EN_CURSO') {
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.snackBar.open('Tiempo agotado. Finalizando…', 'OK', { duration: 3000 });
            this.finalizar(true);
          }
        },
      });
    };
    sync();
    this.timerInterval = setInterval(sync, 1000);
  }

  tiempoFormato(): string {
    const seg = this.tiempoRestanteSeg();
    if (seg === null) return '--:--';
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  responder(pregunta: Pregunta, respuesta: Respuesta) {
    const p = this.participacion();
    if (!p) return;
    const m = new Map(this.seleccion());
    m.set(pregunta.id, respuesta.id);
    this.seleccion.set(m);
    this.servicio.responder(p.id, pregunta.id, respuesta.id).subscribe();
  }

  seleccionDe(pregunta: Pregunta): number | undefined {
    return this.seleccion().get(pregunta.id);
  }

  siguiente() {
    if (this.paginaIdx() < this.paginas().length - 1) {
      this.paginaIdx.update((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  anterior() {
    if (this.paginaIdx() > 0) {
      this.paginaIdx.update((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async finalizar(forzado = false): Promise<void> {
    const p = this.participacion();
    if (!p) return;
    if (p.estado === EstadoParticipacion.Finalizada) return;
    if (!forzado) {
      const ok = await this.ux.confirm({
        titulo: '¿Listo para entregar?',
        mensaje: 'Una vez entregues, no podrás cambiar tus decisiones. Tu docente recibirá los resultados.',
        variant: 'info',
        textoConfirmar: 'Entregar práctica',
        icono: 'flag',
      });
      if (!ok) return;
    }
    this.servicio.finalizar(p.id).subscribe({
      next: (res) => {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.router.navigate(['/estudiante/resultado', res.resultado_id]);
      },
      error: () => this.snackBar.open('No se pudo finalizar.', 'OK', { duration: 3500 }),
    });
  }
}
