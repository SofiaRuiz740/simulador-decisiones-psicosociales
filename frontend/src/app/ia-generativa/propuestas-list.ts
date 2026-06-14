import { CommonModule, DatePipe } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormsModule } from '@angular/forms';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';



import { EstadoPropuestaIA, PropuestaCasoIA } from '../core/models/ia.model';

import { IaService } from '../core/services/ia.service';



type IaTab = 'nueva' | 'borradores' | 'historial';

type FormStep = 'concepto' | 'estructura' | 'tono';



const PASOS_GEN: { ms: number; label: string }[] = [

  { ms: 1200, label: 'Analizando el contexto y objetivo' },

  { ms: 1600, label: 'Construyendo escenarios narrativos' },

  { ms: 1400, label: 'Generando preguntas y opciones' },

  { ms: 1200, label: 'Preparando retroalimentación' },

  { ms: 1100, label: 'Organizando rúbrica de evaluación' },

];



const PROMPTS_INSPIRACION: { label: string; value: string }[] = [

  {

    label: 'Conflicto comunitario',

    value: 'Mediación en un conflicto comunitario por uso del espacio público',

  },

  {

    label: 'Crisis suicida',

    value: 'Decisión ética de un equipo de salud mental en crisis suicida',

  },

  {

    label: 'Discriminación en aula',

    value: 'Manejo de discriminación en el aula universitaria',

  },

  {

    label: 'Presión grupal',

    value: 'Liderazgo y presión grupal en un proyecto académico',

  },

  {

    label: 'Desastre natural',

    value: 'Intervención psicosocial tras un desastre natural',

  },

  {

    label: 'Violencia intrafamiliar',

    value: 'Acompañamiento a una víctima de violencia intrafamiliar',

  },

];



@Component({

  selector: 'app-propuestas-list',

  imports: [

    CommonModule,

    DatePipe,

    FormsModule,

    ReactiveFormsModule,

    RouterLink,

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

  readonly formSteps: { id: FormStep; title: string }[] = [

    { id: 'concepto', title: 'Concepto' },

    { id: 'estructura', title: 'Estructura' },

    { id: 'tono', title: 'Tono narrativo' },

  ];

  readonly dificultades: { id: 'bajo' | 'medio' | 'alto'; label: string; hint: string }[] = [

    { id: 'bajo', label: 'Básico', hint: 'Primer contacto con el tema' },

    { id: 'medio', label: 'Medio', hint: 'Aplicación de conceptos' },

    { id: 'alto', label: 'Avanzado', hint: 'Dilemas complejos' },

  ];



  private readonly ia = inject(IaService);

  private readonly fb = inject(FormBuilder);

  private readonly snackBar = inject(MatSnackBar);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);



  readonly tab = signal<IaTab>('nueva');

  readonly formStep = signal<FormStep>('concepto');

  readonly loadingLista = signal(true);

  readonly generando = signal(false);

  readonly pasoIdx = signal(0);

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



  readonly metricas = computed(() => {

    const lista = this.propuestas();

    return {

      total: lista.length,

      borradores: lista.filter((p) => p.estado === EstadoPropuestaIA.Borrador).length,

      aprobadas: lista.filter((p) => p.estado === EstadoPropuestaIA.Aprobado).length,

      convertidas: lista.filter((p) => p.estado === EstadoPropuestaIA.ConvertidoEnCaso).length,

    };

  });



  readonly historial = computed(() =>

    [...this.propuestas()]

      .filter((p) => p.estado !== EstadoPropuestaIA.Borrador)

      .sort(

        (a, b) =>

          new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime(),

      ),

  );



  readonly formStepIdx = computed(() => this.formSteps.findIndex((s) => s.id === this.formStep()));



  readonly formStepPct = computed(() =>

    Math.round(((this.formStepIdx() + 1) / this.formSteps.length) * 100),

  );



  readonly isFirstFormStep = computed(() => this.formStep() === 'concepto');

  readonly isLastFormStep = computed(() => this.formStep() === 'tono');



  readonly pctPasos = computed(() => Math.round((this.pasoIdx() / PASOS_GEN.length) * 100));



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



  goFormStep(step: FormStep): void {

    this.formStep.set(step);

  }



  prevFormStep(): void {

    const idx = this.formStepIdx();

    if (idx > 0) this.formStep.set(this.formSteps[idx - 1].id);

  }



  nextFormStep(): void {

    if (!this.validarPasoActual()) {

      this.form.markAllAsTouched();

      return;

    }

    const idx = this.formStepIdx();

    if (idx < this.formSteps.length - 1) this.formStep.set(this.formSteps[idx + 1].id);

  }



  onFooterPrimary(): void {

    if (this.isLastFormStep()) {

      this.generar();

    } else {

      this.nextFormStep();

    }

  }



  validarPasoActual(): boolean {

    if (this.formStep() === 'concepto') {

      return this.form.controls.tema.valid && this.form.controls.objetivo_aprendizaje.valid;

    }

    return true;

  }



  setDificultad(nivel: 'bajo' | 'medio' | 'alto'): void {

    if (this.generando()) return;

    this.form.controls.nivel_dificultad.setValue(nivel);

  }



  ajustarNumero(

    campo: 'numero_escenarios' | 'numero_preguntas_por_escenario',

    delta: number,

  ): void {

    if (this.generando()) return;

    const ctrl = this.form.controls[campo];

    const min = campo === 'numero_escenarios' ? 1 : 1;

    const max = campo === 'numero_escenarios' ? 8 : 6;

    ctrl.setValue(Math.min(max, Math.max(min, ctrl.value + delta)));

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

      case EstadoPropuestaIA.EnRevision:

        return 'badge badge--en-revision';

      case EstadoPropuestaIA.Aprobado:

        return 'badge badge--aprobado';

      case EstadoPropuestaIA.Rechazado:

        return 'badge badge--descartado';

      case EstadoPropuestaIA.ConvertidoEnCaso:

        return 'badge badge--validado';

      case EstadoPropuestaIA.Borrador:

        return 'badge badge--borrador';

      default:

        return 'badge';

    }

  }



  historialDotClass(estado: EstadoPropuestaIA): string {

    if (

      estado === EstadoPropuestaIA.Aprobado ||

      estado === EstadoPropuestaIA.ConvertidoEnCaso

    ) {

      return 'activity-item__dot activity-item__dot--teal';

    }

    return 'activity-item__dot';

  }



  nivelLabel(nivel: string): string {

    switch (nivel) {

      case 'bajo':

        return 'Básico';

      case 'alto':

        return 'Avanzado';

      default:

        return 'Medio';

    }

  }



  aplicarPrompt(prompt: { label: string; value: string }): void {

    if (this.generando()) return;

    this.form.controls.tema.setValue(prompt.value);

    this.form.controls.tema.markAsDirty();

  }



  generar(): void {

    if (this.form.invalid || this.generando()) {

      this.form.markAllAsTouched();

      return;

    }

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

        const msg =

          err?.error?.detail ||

          'No se pudo generar la propuesta. Intenta de nuevo en unos segundos.';

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

