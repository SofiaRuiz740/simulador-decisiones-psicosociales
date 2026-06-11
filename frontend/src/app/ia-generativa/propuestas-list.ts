import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EstadoPropuestaIA, PropuestaCasoIA } from '../core/models/ia.model';
import { IaService } from '../core/services/ia.service';

type IaTab = 'nueva' | 'borradores' | 'historial';

/** Cada paso del simulador de progreso visual durante la generación.
 *  `ms` controla el tiempo entre pasos para que la barra avance sin esperar
 *  a la respuesta del backend (la generación real puede tardar 6-20s).
 */
const PASOS_GEN: { ms: number; label: string; icon: string }[] = [
  { ms: 1200, label: 'Analizando el contexto y objetivo', icon: 'psychology' },
  { ms: 1600, label: 'Construyendo escenarios narrativos', icon: 'auto_stories' },
  { ms: 1400, label: 'Generando preguntas y opciones', icon: 'quiz' },
  { ms: 1200, label: 'Preparando retroalimentación', icon: 'forum' },
  { ms: 1100, label: 'Organizando rúbrica de evaluación', icon: 'fact_check' },
];

/** Prompts de inspiración mostrados como chips clickables sobre "Tema". */
const PROMPTS_INSPIRACION = [
  'Mediación en un conflicto comunitario por uso del espacio público',
  'Decisión ética de un equipo de salud mental en crisis suicida',
  'Manejo de discriminación en el aula universitaria',
  'Liderazgo y presión grupal en un proyecto académico',
  'Intervención psicosocial tras un desastre natural',
  'Acompañamiento a una víctima de violencia intrafamiliar',
];

@Component({
  selector: 'app-propuestas-list',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './propuestas-list.html',
  styleUrl: './propuestas-list.scss',
})
export class PropuestasListPage implements OnInit {
  readonly EstadoPropuestaIA = EstadoPropuestaIA;
  readonly pasosGen = PASOS_GEN;
  readonly promptsInspiracion = PROMPTS_INSPIRACION;

  private readonly ia = inject(IaService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tab = signal<IaTab>('nueva');
  readonly loadingLista = signal(true);
  readonly generando = signal(false);
  readonly pasoIdx = signal(0);
  /** Mensaje de error inline (en lugar de snackbar) para que sea visible mientras revisa. */
  readonly errorGeneracion = signal<string | null>(null);
  readonly propuestas = signal<PropuestaCasoIA[]>([]);

  readonly filtroTexto = signal('');
  readonly filtroEstado = signal<EstadoPropuestaIA | ''>('');

  readonly form = this.fb.nonNullable.group({
    tema: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(300)]],
    objetivo_aprendizaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(600)]],
    nivel_dificultad: ['medio' as 'bajo' | 'medio' | 'alto', Validators.required],
    numero_escenarios: [3, [Validators.required, Validators.min(1), Validators.max(8)]],
    numero_preguntas_por_escenario: [2, [Validators.required, Validators.min(1), Validators.max(6)]],
    tono: ['académico, narrativo e interactivo', [Validators.maxLength(200)]],
  });

  readonly filtradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();
    return this.propuestas().filter((p) => {
      if (est && p.estado !== est) return false;
      if (!txt) return true;
      return (
        p.titulo.toLowerCase().includes(txt) ||
        p.tema.toLowerCase().includes(txt) ||
        p.objetivo_aprendizaje.toLowerCase().includes(txt)
      );
    });
  });

  readonly pctPasos = computed(() =>
    Math.round((this.pasoIdx() / PASOS_GEN.length) * 100),
  );

  ngOnInit(): void {
    if (this.route.snapshot.routeConfig?.path === 'nuevo') {
      this.tab.set('nueva');
    }
    this.route.queryParamMap.subscribe((params) => {
      const t = params.get('tab');
      if (t === 'nueva' || t === 'borradores' || t === 'historial') {
        this.tab.set(t);
      }
    });
    this.cargarLista();
  }

  setTab(t: IaTab): void {
    this.tab.set(t);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: t },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  cargarLista(): void {
    this.loadingLista.set(true);
    this.ia.listarPropuestas().subscribe({
      next: (resp) => {
        this.propuestas.set(resp.results);
        this.loadingLista.set(false);
      },
      error: () => {
        this.loadingLista.set(false);
        this.snackBar.open('No se pudieron cargar las propuestas.', 'OK', { duration: 3500 });
      },
    });
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case EstadoPropuestaIA.EnRevision: return 'badge badge--en-revision';
      case EstadoPropuestaIA.Aprobado: return 'badge badge--aprobado';
      case EstadoPropuestaIA.Rechazado: return 'badge badge--descartado';
      case EstadoPropuestaIA.ConvertidoEnCaso: return 'badge badge--validado';
      case EstadoPropuestaIA.Borrador: return 'badge badge--borrador';
      default: return 'badge';
    }
  }

  /** Aplica un prompt sugerido al campo "Tema". */
  aplicarPrompt(prompt: string): void {
    if (this.generando()) return;
    this.form.controls.tema.setValue(prompt);
    this.form.controls.tema.markAsDirty();
  }

  generar(): void {
    if (this.form.invalid || this.generando()) return;
    this.errorGeneracion.set(null);
    this.generando.set(true);
    this.pasoIdx.set(0);
    this.simularPaso(0);

    this.ia.generarCaso(this.form.getRawValue()).subscribe({
      next: (propuesta) => {
        this.pasoIdx.set(PASOS_GEN.length);
        this.generando.set(false);
        this.snackBar.open('Propuesta generada.', 'OK', { duration: 2500 });
        this.router.navigate(['/ia-generativa/propuesta', propuesta.id]);
      },
      error: (err) => {
        this.generando.set(false);
        const msg = err?.error?.detail || 'No se pudo generar la propuesta. Intenta de nuevo en unos segundos.';
        this.errorGeneracion.set(msg);
      },
    });
  }

  private simularPaso(i: number): void {
    if (i >= PASOS_GEN.length) return;
    setTimeout(() => {
      if (!this.generando()) return;
      this.pasoIdx.set(i + 1);
      this.simularPaso(i + 1);
    }, PASOS_GEN[i].ms);
  }
}
