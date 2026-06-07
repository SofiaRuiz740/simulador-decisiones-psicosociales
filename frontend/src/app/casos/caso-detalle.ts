import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CasoDetalle, Escenario, Pregunta, Respuesta } from '../core/models/casos.model';
import { CasosService, ProblemaValidacion } from '../core/services/casos.service';
import { UxService } from '../core/services/ux.service';
import { CasePreview, CasePreviewData } from '../shared/components/case-preview/case-preview';

@Component({
  selector: 'app-caso-detalle',
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressBarModule,
    MatSnackBarModule, MatTooltipModule, MatDividerModule, MatSelectModule,
    CasePreview,
  ],
  templateUrl: './caso-detalle.html',
  styleUrl: './caso-detalle.scss',
})
export class CasoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(CasosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly caso = signal<CasoDetalle | null>(null);
  readonly problemas = signal<ProblemaValidacion[]>([]);
  readonly validando = signal(false);
  readonly step = signal('casos-datos');
  readonly escenarioExpandido = signal<number | null>(null);
  readonly preguntaSel = signal<number | null>(null);

  readonly builderSteps = [
    { id: 'casos-datos', group: 'Información', title: 'Datos generales' },
    { id: 'casos-contexto', group: 'Narrativa', title: 'Contexto e historia' },
    { id: 'casos-escenarios', group: 'Simulación', title: 'Escenarios' },
    { id: 'casos-preguntas', group: 'Simulación', title: 'Preguntas' },
    { id: 'casos-respuestas', group: 'Simulación', title: 'Respuestas' },
    { id: 'casos-retro', group: 'Evaluación', title: 'Retroalimentación' },
    { id: 'casos-rubrica', group: 'Evaluación', title: 'Rúbrica' },
    { id: 'casos-preview', group: 'Cierre', title: 'Vista previa' },
  ];

  readonly stepGroups = [
    { label: 'Información', steps: this.builderSteps.filter((s) => s.group === 'Información') },
    { label: 'Narrativa', steps: this.builderSteps.filter((s) => s.group === 'Narrativa') },
    { label: 'Simulación', steps: this.builderSteps.filter((s) => s.group === 'Simulación') },
    { label: 'Evaluación', steps: this.builderSteps.filter((s) => s.group === 'Evaluación') },
    { label: 'Cierre', steps: this.builderSteps.filter((s) => s.group === 'Cierre') },
  ];

  readonly stepIndex = computed(() =>
    this.builderSteps.findIndex((s) => s.id === this.step()),
  );

  readonly pctCompletado = computed(() => {
    const c = this.caso();
    if (!c) return 0;
    let pts = 10;
    if (c.contexto_historia?.trim()) pts += 15;
    if (c.escenarios.length) pts += 20;
    if (this.totalPreguntas() > 0) pts += 20;
    if (c.rubrica?.criterios?.length) pts += 15;
    return Math.min(100, pts);
  });

  readonly filasPreguntas = computed(() => {
    const c = this.caso();
    if (!c) return [];
    return c.escenarios.flatMap((esc) =>
      esc.preguntas.map((p) => ({
        pregunta: p,
        escenarioOrden: esc.orden,
        escenarioId: esc.id,
      })),
    );
  });

  readonly totalPreguntas = computed(() => this.filasPreguntas().length);

  readonly preguntaActiva = computed(() => {
    const id = this.preguntaSel();
    if (!id) return null;
    for (const esc of this.caso()?.escenarios ?? []) {
      const p = esc.preguntas.find((x) => x.id === id);
      if (p) return p;
    }
    return null;
  });

  readonly siguienteOrdenEscenario = computed(() => {
    const c = this.caso();
    if (!c || c.escenarios.length === 0) return 1;
    return Math.max(...c.escenarios.map((e) => e.orden)) + 1;
  });
  readonly criteriosDisponibles = computed(() =>
    this.caso()?.rubrica?.criterios ?? [],
  );

  readonly previewData = computed((): CasePreviewData | null => {
    const c = this.caso();
    if (!c) return null;
    const esc = c.escenarios[0];
    const preg = esc?.preguntas[0];
    return {
      titulo: c.nombre,
      area: c.area_psicosocial,
      tiempoMin: c.tiempo_estimado_min,
      escenariosCount: c.escenarios.length,
      preguntasCount: this.totalPreguntas(),
      estadoDisplay: c.estado_display,
      escenarioTitulo: esc?.titulo,
      escenarioOrden: esc?.orden,
      escenariosTotal: c.escenarios.length,
      narrativa: esc?.narrativa || c.contexto_historia || c.descripcion,
      pregunta: preg?.enunciado,
      opciones: preg?.respuestas?.map((r) => ({ texto: r.texto })) ?? [],
      progresoPct: this.pctCompletado(),
    };
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/casos']); return; }
    this.cargar(id);
  }

  cargar(id: number) {
    this.loading.set(true);
    this.servicio.obtenerCaso(id).subscribe({
      next: (c) => {
        this.caso.set(c);
        const firstPreg = c.escenarios.flatMap((e) => e.preguntas)[0];
        if (firstPreg) this.preguntaSel.set(firstPreg.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar el caso.', 'OK', { duration: 3500 });
        this.router.navigate(['/casos']);
      },
    });
  }

  stepNum(stepId: string): number {
    return this.builderSteps.findIndex((s) => s.id === stepId) + 1;
  }

  stepLabel(): string {
    const s = this.builderSteps[this.stepIndex()];
    return s ? `${s.title} · ${this.stepIndex() + 1}/${this.builderSteps.length}` : '';
  }

  goStep(id: string): void {
    this.step.set(id);
  }

  prevStep(): void {
    const idx = this.stepIndex();
    if (idx > 0) this.step.set(this.builderSteps[idx - 1].id);
  }

  nextStep(): void {
    const idx = this.stepIndex();
    if (idx < this.builderSteps.length - 1) this.step.set(this.builderSteps[idx + 1].id);
  }

  toggleEscenario(id: number): void {
    this.escenarioExpandido.set(this.escenarioExpandido() === id ? null : id);
  }

  irPregunta(preguntaId: number): void {
    this.preguntaSel.set(preguntaId);
    const row = this.filasPreguntas().find((r) => r.pregunta.id === preguntaId);
    if (row) {
      this.escenarioExpandido.set(row.escenarioId);
      this.step.set('casos-escenarios');
    }
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'VALIDADO': return 'badge badge--validado';
      case 'BORRADOR': return 'badge badge--borrador';
      case 'EN_REVISION': return 'badge badge--en-revision';
      case 'ARCHIVADO': return 'badge badge--archivado';
      default: return 'badge';
    }
  }

  // ---------- Caso (metadatos + texto largo) ----------

  guardarDatos(): void {
    const c = this.caso();
    if (!c) return;
    this.servicio.actualizarCaso(c.id, {
      nombre: c.nombre,
      descripcion: c.descripcion,
      area_psicosocial: c.area_psicosocial,
      tiempo_estimado_min: c.tiempo_estimado_min,
    }).subscribe({
      next: () => this.snackBar.open('Datos generales guardados.', 'OK', { duration: 2500 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }

  guardarTextoLargo(): void {
    const c = this.caso();
    if (!c) return;
    this.servicio.actualizarCaso(c.id, {
      contexto_historia: c.contexto_historia,
      desarrollo_situacional: c.desarrollo_situacional,
    }).subscribe({
      next: () => this.snackBar.open('Historia y contexto guardados.', 'OK', { duration: 2500 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }

  // ---------- Escenarios ----------

  async agregarEscenario(): Promise<void> {
    const c = this.caso();
    if (!c) return;
    const titulo = await this.ux.askInput({
      titulo: 'Nuevo escenario',
      mensaje: 'Dale un título descriptivo. La narrativa la podrás editar después.',
      label: 'Título del escenario',
      placeholder: 'Ej: Inicio del dilema',
      icono: 'view_carousel',
      required: true,
      maxlength: 200,
    });
    if (!titulo) return;
    this.servicio.crearEscenario({
      caso: c.id, orden: this.siguienteOrdenEscenario(),
      titulo, narrativa: '',
    }).subscribe({
      next: () => this.cargar(c.id),
      error: () => this.snackBar.open('No se pudo crear el escenario.', 'OK', { duration: 3500 }),
    });
  }

  guardarEscenario(esc: Escenario): void {
    this.servicio.actualizarEscenario(esc.id, {
      titulo: esc.titulo, narrativa: esc.narrativa, orden: esc.orden,
    }).subscribe({
      next: () => this.snackBar.open(`Escenario "${esc.titulo}" guardado.`, 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }

  async eliminarEscenario(esc: Escenario): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Eliminar escenario',
      mensaje: `Se eliminará "${esc.titulo}" junto con todas sus preguntas y respuestas. Esta acción no se puede deshacer.`,
      variant: 'danger',
      textoConfirmar: 'Eliminar',
    });
    if (!ok) return;
    this.servicio.eliminarEscenario(esc.id).subscribe(() => this.cargar(this.caso()!.id));
  }

  // ---------- Preguntas ----------

  async agregarPregunta(esc: Escenario): Promise<void> {
    const enunciado = await this.ux.askInput({
      titulo: 'Nueva pregunta',
      mensaje: 'Escribe la decisión que tendrá que tomar el estudiante.',
      label: 'Enunciado',
      placeholder: 'Ej: ¿Qué decisión tomas frente a la presión del grupo?',
      icono: 'quiz',
      multiline: true,
      rows: 3,
      required: true,
      maxlength: 600,
    });
    if (!enunciado) return;
    const orden = esc.preguntas.length === 0 ? 1 : Math.max(...esc.preguntas.map((p) => p.orden)) + 1;
    this.servicio.crearPregunta({ escenario: esc.id, orden, enunciado }).subscribe(() => this.cargar(this.caso()!.id));
  }

  guardarPregunta(p: Pregunta): void {
    this.servicio.actualizarPregunta(p.id, {
      enunciado: p.enunciado, orden: p.orden, peso: p.peso,
      criterio_rubrica_id: p.criterio_rubrica_id || '',
    }).subscribe({
      next: () => this.snackBar.open('Pregunta guardada.', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }

  async eliminarPregunta(p: Pregunta): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Eliminar pregunta',
      mensaje: 'Se borrará la pregunta junto con todas sus opciones de respuesta.',
      variant: 'danger',
      textoConfirmar: 'Eliminar',
    });
    if (!ok) return;
    this.servicio.eliminarPregunta(p.id).subscribe(() => this.cargar(this.caso()!.id));
  }

  // ---------- Respuestas ----------

  async agregarRespuesta(p: Pregunta): Promise<void> {
    const texto = await this.ux.askInput({
      titulo: 'Nueva opción de respuesta',
      mensaje: 'Describe una posible decisión del estudiante.',
      label: 'Texto de la opción',
      placeholder: 'Ej: Propones una alternativa al grupo',
      icono: 'lightbulb',
      multiline: true,
      rows: 2,
      required: true,
      maxlength: 400,
    });
    if (!texto) return;
    const orden = p.respuestas.length === 0 ? 1 : Math.max(...p.respuestas.map((r) => r.orden)) + 1;
    this.servicio.crearRespuesta({ pregunta: p.id, orden, texto, es_correcta: false }).subscribe(() => this.cargar(this.caso()!.id));
  }

  guardarRespuesta(r: Respuesta): void {
    this.servicio.actualizarRespuesta(r.id, {
      texto: r.texto, es_correcta: r.es_correcta,
      justificacion: r.justificacion, retroalimentacion: r.retroalimentacion,
      orden: r.orden,
    }).subscribe({
      next: () => this.snackBar.open('Respuesta guardada.', 'OK', { duration: 2000 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }

  async eliminarRespuesta(r: Respuesta): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Eliminar opción',
      mensaje: 'Esta opción de respuesta se eliminará del caso.',
      variant: 'danger',
      textoConfirmar: 'Eliminar',
    });
    if (!ok) return;
    this.servicio.eliminarRespuesta(r.id).subscribe(() => this.cargar(this.caso()!.id));
  }

  // ---------- Acciones de gestión ----------

  validar(): void {
    const c = this.caso();
    if (!c) return;
    this.validando.set(true);
    this.servicio.validarCaso(c.id).subscribe({
      next: (res) => {
        this.problemas.set(res.problemas);
        this.validando.set(false);
        const msg = res.valido
          ? 'El caso pasó la validación. Puedes publicarlo.'
          : `Hay ${res.problemas.length} problema(s) por resolver.`;
        this.snackBar.open(msg, 'OK', { duration: 3500 });
      },
      error: () => {
        this.validando.set(false);
        this.snackBar.open('No se pudo validar el caso.', 'OK', { duration: 3500 });
      },
    });
  }

  async publicar(): Promise<void> {
    const c = this.caso();
    if (!c) return;
    const ok = await this.ux.confirm({
      titulo: 'Publicar caso',
      mensaje: 'El caso quedará disponible para asignarse a una práctica. Podrás editarlo después.',
      variant: 'info',
      textoConfirmar: 'Publicar',
      icono: 'rocket_launch',
    });
    if (!ok) return;
    this.servicio.publicarCaso(c.id).subscribe({
      next: (actualizado) => {
        this.caso.set(actualizado);
        this.problemas.set([]);
        this.snackBar.open('Caso publicado correctamente.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        const problemas: ProblemaValidacion[] = err?.error?.problemas ?? [];
        if (problemas.length) this.problemas.set(problemas);
        this.snackBar.open(
          err?.error?.detail || 'No se pudo publicar.',
          'OK', { duration: 4000 },
        );
      },
    });
  }

  async archivar(): Promise<void> {
    const c = this.caso();
    if (!c) return;
    const ok = await this.ux.confirm({
      titulo: 'Archivar caso',
      mensaje: 'El caso se ocultará de los listados activos. Podrás recuperarlo desde el filtro de archivados.',
      variant: 'warn',
      textoConfirmar: 'Archivar',
      icono: 'inventory_2',
    });
    if (!ok) return;
    this.servicio.archivarCaso(c.id).subscribe({
      next: (actualizado) => {
        this.caso.set(actualizado);
        this.snackBar.open('Caso archivado.', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo archivar.', 'OK', { duration: 3500 }),
    });
  }

  async duplicar(): Promise<void> {
    const c = this.caso();
    if (!c) return;
    const ok = await this.ux.confirm({
      titulo: 'Duplicar caso',
      mensaje: 'Se creará una copia idéntica en estado borrador para que la edites por separado.',
      variant: 'info',
      textoConfirmar: 'Duplicar',
      icono: 'content_copy',
    });
    if (!ok) return;
    this.servicio.duplicarCaso(c.id).subscribe({
      next: (nuevo) => {
        this.snackBar.open('Caso duplicado.', 'Abrir', { duration: 4000 })
          .onAction().subscribe(() => this.router.navigate(['/casos', nuevo.id]));
        this.router.navigate(['/casos', nuevo.id]);
      },
      error: () => this.snackBar.open('No se pudo duplicar.', 'OK', { duration: 3500 }),
    });
  }
}
