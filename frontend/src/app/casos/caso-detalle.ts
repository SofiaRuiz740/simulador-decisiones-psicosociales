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

@Component({
  selector: 'app-caso-detalle',
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressBarModule,
    MatSnackBarModule, MatTooltipModule, MatDividerModule, MatSelectModule,
  ],
  templateUrl: './caso-detalle.html',
  styleUrl: './caso-detalle.scss',
})
export class CasoDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(CasosService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly caso = signal<CasoDetalle | null>(null);
  readonly problemas = signal<ProblemaValidacion[]>([]);
  readonly validando = signal(false);
  readonly siguienteOrdenEscenario = computed(() => {
    const c = this.caso();
    if (!c || c.escenarios.length === 0) return 1;
    return Math.max(...c.escenarios.map((e) => e.orden)) + 1;
  });
  readonly criteriosDisponibles = computed(() =>
    this.caso()?.rubrica?.criterios ?? [],
  );

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/casos']); return; }
    this.cargar(id);
  }

  cargar(id: number) {
    this.loading.set(true);
    this.servicio.obtenerCaso(id).subscribe({
      next: (c) => { this.caso.set(c); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar el caso.', 'OK', { duration: 3500 });
        this.router.navigate(['/casos']);
      },
    });
  }

  // ---------- Caso (texto largo: contexto + desarrollo) ----------

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

  agregarEscenario(): void {
    const c = this.caso();
    if (!c) return;
    const titulo = prompt('Título del nuevo escenario:');
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

  eliminarEscenario(esc: Escenario): void {
    if (!confirm(`¿Eliminar escenario "${esc.titulo}" y todas sus preguntas?`)) return;
    this.servicio.eliminarEscenario(esc.id).subscribe(() => this.cargar(this.caso()!.id));
  }

  // ---------- Preguntas ----------

  agregarPregunta(esc: Escenario): void {
    const enunciado = prompt('Enunciado de la nueva pregunta:');
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

  eliminarPregunta(p: Pregunta): void {
    if (!confirm('¿Eliminar pregunta y sus respuestas?')) return;
    this.servicio.eliminarPregunta(p.id).subscribe(() => this.cargar(this.caso()!.id));
  }

  // ---------- Respuestas ----------

  agregarRespuesta(p: Pregunta): void {
    const texto = prompt('Texto de la nueva respuesta:');
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

  eliminarRespuesta(r: Respuesta): void {
    if (!confirm('¿Eliminar esta respuesta?')) return;
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

  publicar(): void {
    const c = this.caso();
    if (!c) return;
    if (!confirm('¿Publicar este caso? Quedará listo para asignarse a una práctica.')) return;
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

  archivar(): void {
    const c = this.caso();
    if (!c) return;
    if (!confirm('¿Archivar el caso? Se ocultará de los listados activos.')) return;
    this.servicio.archivarCaso(c.id).subscribe({
      next: (actualizado) => {
        this.caso.set(actualizado);
        this.snackBar.open('Caso archivado.', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo archivar.', 'OK', { duration: 3500 }),
    });
  }

  duplicar(): void {
    const c = this.caso();
    if (!c) return;
    if (!confirm('¿Duplicar el caso? Se creará una copia en estado BORRADOR.')) return;
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
