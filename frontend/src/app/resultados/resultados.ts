import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { Resultado } from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';

@Component({
  selector: 'app-resultados',
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTableModule, MatCardModule, MatButtonModule, MatIconModule,
    MatExpansionModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <section class="page">
      <header class="hero-block anim-fade-up">
        <div class="hero-text">
          <span class="kicker">Análisis</span>
          <h1>Resultados</h1>
          <p>
            Calificaciones por participación. Toca cada fila para ver el
            desempeño por criterio, las decisiones del estudiante y dejar tu
            retroalimentación.
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat"><strong>{{ resultados().length }}</strong><span>Total</span></div>
          <div class="stat"><strong>{{ aprobadosCount() }}</strong><span>Aprobados</span></div>
          <div class="stat"><strong>{{ promedioNota() | number:'1.1-1' }}</strong><span>Promedio</span></div>
        </div>
      </header>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (!loading() && resultados().length === 0) {
        <div class="empty-state">
          <mat-icon>assessment</mat-icon>
          <h3>Aún no hay resultados</h3>
          <p>Los resultados aparecen cuando los estudiantes finalizan sus prácticas.</p>
        </div>
      }

      <mat-accordion>
        @for (r of resultados(); track r.id) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                {{ r.estudiante_nombre }} ({{ r.estudiante_correo }})
              </mat-panel-title>
              <mat-panel-description>
                {{ r.practica_nombre }} · <strong>{{ r.nota_final }}/100</strong> ·
                {{ r.correctas }}✓ {{ r.incorrectas }}✗ {{ r.no_respondidas }}—
              </mat-panel-description>
            </mat-expansion-panel-header>

            <p class="meta">
              Calculado: {{ r.fecha_calculo | date:'medium' }} ·
              Peso obtenido: {{ r.peso_obtenido }}/{{ r.peso_total }} ·
              <span [class.aprob]="r.aprobado" [class.no-aprob]="!r.aprobado">
                {{ r.aprobado ? 'Aprobado' : 'No aprobado' }} (mín {{ r.nota_aprobacion }})
              </span>
            </p>

            @if (r.desglose_criterios && r.desglose_criterios.length > 0) {
              <h3>Desempeño por criterio</h3>
              <div class="criterios-mini">
                @for (cr of r.desglose_criterios; track cr.criterio_id) {
                  <div class="cr-row">
                    <div class="cr-info">
                      <strong>{{ cr.nombre }}</strong>
                      <span>{{ cr.peso }}% · {{ cr.porcentaje | number:'1.0-0' }}% aciertos
                        @if (cr.nivel_alcanzado) {
                          · {{ cr.nivel_alcanzado.nombre }}
                        }
                      </span>
                    </div>
                    <div class="cr-bar">
                      <div class="cr-fill" [style.width.%]="cr.porcentaje"></div>
                    </div>
                  </div>
                }
              </div>
            }

            <h3>Detalle pregunta por pregunta</h3>
            <ul class="detalle">
              @for (d of r.detalle_preguntas; track d.pregunta_id; let i = $index) {
                <li>
                  <strong>{{ i + 1 }}. {{ d.enunciado }}</strong> (peso {{ d.peso }})
                  @if (d.respondida && d.respuesta_elegida) {
                    <div [class.ok]="d.respuesta_elegida.es_correcta" [class.err]="!d.respuesta_elegida.es_correcta">
                      Eligió: {{ d.respuesta_elegida.texto }}
                      @if (d.respuesta_elegida.es_correcta) { ✓ } @else { ✗ }
                    </div>
                  } @else {
                    <div class="ne">No respondió</div>
                  }
                </li>
              }
            </ul>

            <h3>Feedback docente</h3>
            <mat-form-field appearance="outline" class="feedback">
              <textarea matInput rows="3" [(ngModel)]="feedbackEdit[r.id]"
                [placeholder]="r.feedback_docente || 'Escribe tu feedback aquí…'"></textarea>
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="guardarFeedback(r)">
              <mat-icon>save</mat-icon> Guardar feedback
            </button>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; }
    h3 { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; }
    .meta { color: var(--mat-sys-on-surface-variant); font-size: 0.85rem; margin: 0.5rem 0; }
    .aprob { color: var(--mat-sys-primary); font-weight: 600; }
    .no-aprob { color: var(--mat-sys-error); font-weight: 600; }
    h3 { font-size: 1rem; font-weight: 500; margin: 1rem 0 0.5rem; }
    .detalle { padding-left: 1.25rem; }
    .detalle li { margin-bottom: 0.5rem; }
    .ok { color: var(--mat-sys-primary); }
    .err { color: var(--mat-sys-error); }
    .ne { color: var(--mat-sys-on-surface-variant); font-style: italic; }
    .feedback { width: 100%; }
    button { display: inline-flex; align-items: center; gap: 0.4rem; }

    .criterios-mini {
      display: flex; flex-direction: column; gap: 0.5rem;
      .cr-row {
        background: var(--mat-sys-surface-container-low);
        border-radius: 10px;
        padding: 0.5rem 0.75rem;
        display: flex; flex-direction: column; gap: 0.35rem;
      }
      .cr-info {
        display: flex; justify-content: space-between; align-items: center;
        gap: 0.5rem; flex-wrap: wrap;
        strong { font-weight: 600; }
        span { font-size: 0.82rem; color: var(--mat-sys-on-surface-variant); }
      }
      .cr-bar {
        width: 100%; height: 6px;
        background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
        border-radius: 999px;
        overflow: hidden;
      }
      .cr-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
      }
    }
  `],
})
export class Resultados implements OnInit {
  private readonly servicio = inject(SimulacionService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly resultados = signal<Resultado[]>([]);
  readonly feedbackEdit: Record<number, string> = {};

  readonly aprobadosCount = computed(() => this.resultados().filter((r) => r.aprobado).length);
  readonly promedioNota = computed(() => {
    const xs = this.resultados();
    if (xs.length === 0) return 0;
    const total = xs.reduce((acc, r) => acc + Number(r.nota_final || 0), 0);
    return total / xs.length;
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.servicio.listarResultados().subscribe({
      next: (r) => {
        this.resultados.set(r.results);
        for (const res of r.results) this.feedbackEdit[res.id] = res.feedback_docente;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  guardarFeedback(r: Resultado) {
    const fb = this.feedbackEdit[r.id] ?? '';
    this.servicio.guardarFeedback(r.id, fb).subscribe({
      next: () => this.snackBar.open('Feedback guardado.', 'OK', { duration: 2500 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }
}
