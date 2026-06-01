import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { IaService } from '../core/services/ia.service';

const PASOS: { titulo: string; sub: string; ms: number }[] = [
  { titulo: 'Construyendo el contexto narrativo', sub: 'Definimos personaje, conflicto y ambiente.', ms: 1200 },
  { titulo: 'Generando escenarios', sub: 'Cada escena introduce una nueva tensión psicosocial.', ms: 1600 },
  { titulo: 'Diseñando decisiones', sub: 'Opciones con justificación teórica e impacto narrativo.', ms: 1400 },
  { titulo: 'Construyendo retroalimentaciones', sub: 'Conectamos cada opción con teorías reconocidas.', ms: 1200 },
  { titulo: 'Generando rúbrica', sub: 'Criterios y niveles alineados al objetivo.', ms: 1100 },
];

@Component({
  selector: 'app-generar-caso',
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressBarModule, MatSnackBarModule, MatChipsModule,
  ],
  templateUrl: './generar-caso.html',
  styleUrl: './generar-caso.scss',
})
export class GenerarCasoPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ia = inject(IaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly proveedorActivo = signal<boolean | null>(null);
  readonly pasoIdx = signal(0);
  readonly pasos = PASOS;

  readonly form = this.fb.nonNullable.group({
    tema: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(300)]],
    objetivo_aprendizaje: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(600)],
    ],
    nivel_dificultad: ['medio' as 'bajo' | 'medio' | 'alto', Validators.required],
    numero_escenarios: [3, [Validators.required, Validators.min(1), Validators.max(8)]],
    numero_preguntas_por_escenario: [2, [Validators.required, Validators.min(1), Validators.max(6)]],
    tono: ['académico, narrativo e interactivo', [Validators.maxLength(200)]],
  });

  readonly pctPasos = computed(() => Math.round((this.pasoIdx() / PASOS.length) * 100));

  ngOnInit(): void {
    this.ia.estado().subscribe({
      next: (e) => this.proveedorActivo.set(e.proveedor_activo),
      error: () => this.proveedorActivo.set(false),
    });
  }

  generar(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.pasoIdx.set(0);
    this.simularPaso(0);

    this.ia.generarCaso(this.form.getRawValue()).subscribe({
      next: (propuesta) => {
        this.pasoIdx.set(PASOS.length);
        this.loading.set(false);
        this.snackBar.open('Propuesta generada. Revísala como un juego.', 'Abrir', { duration: 3500 });
        this.router.navigate(['/ia-generativa/propuesta', propuesta.id]);
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(
          err?.error?.detail || 'No se pudo generar la propuesta.',
          'OK', { duration: 4500 },
        );
      },
    });
  }

  private simularPaso(i: number): void {
    if (i >= PASOS.length) return;
    setTimeout(() => {
      if (!this.loading()) return;
      this.pasoIdx.set(i + 1);
      this.simularPaso(i + 1);
    }, PASOS[i].ms);
  }
}
