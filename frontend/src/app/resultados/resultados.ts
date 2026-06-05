import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Resultado } from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';

@Component({
  selector: 'app-resultados',
  imports: [
    CommonModule, FormsModule, DatePipe, DecimalPipe,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressBarModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './resultados.html',
  styleUrl: './resultados.scss',
})
export class Resultados implements OnInit {
  private readonly servicio = inject(SimulacionService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly resultados = signal<Resultado[]>([]);
  readonly feedbackEdit: Record<number, string> = {};
  readonly expandedId = signal<number | null>(null);

  // Filtros
  filtroTexto = '';
  filtroPractica: string | '' = '';

  readonly practicasUnicas = computed(() => {
    const set = new Map<number, string>();
    this.resultados().forEach((r) => set.set(r.practica_id, r.practica_nombre));
    return Array.from(set.entries()).map(([id, nombre]) => ({ id: String(id), nombre }));
  });

  readonly filtrados = computed(() => {
    const txt = (this.filtroTexto || '').toLowerCase().trim();
    const prac = this.filtroPractica;
    return this.resultados().filter((r) => {
      if (prac && String(r.practica_id) !== prac) return false;
      if (!txt) return true;
      return (
        r.estudiante_nombre.toLowerCase().includes(txt) ||
        r.estudiante_correo.toLowerCase().includes(txt) ||
        r.practica_nombre.toLowerCase().includes(txt)
      );
    });
  });

  // KPIs
  readonly total = computed(() => this.resultados().length);
  readonly aprobadosCount = computed(() => this.resultados().filter((r) => r.aprobado).length);
  readonly aprobadosPct = computed(() => {
    const t = this.total();
    return t === 0 ? 0 : (this.aprobadosCount() / t) * 100;
  });
  readonly promedio = computed(() => {
    const xs = this.resultados();
    if (xs.length === 0) return 0;
    const total = xs.reduce((acc, r) => acc + Number(r.nota_final || 0), 0);
    return total / xs.length;
  });
  readonly sinFeedback = computed(() =>
    this.resultados().filter((r) => !r.feedback_docente?.trim()).length,
  );

  ngOnInit() {
    this.cargar();
  }

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

  toggle(id: number) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  tier(nota: number): { emoji: string; label: string; variant: 'top' | 'mid' | 'low' | 'fail' } {
    if (nota >= 85) return { emoji: '🏆', label: 'Sobresaliente', variant: 'top' };
    if (nota >= 70) return { emoji: '🎯', label: 'Notable', variant: 'mid' };
    if (nota >= 50) return { emoji: '🌱', label: 'En camino', variant: 'low' };
    return { emoji: '✕', label: 'No alcanza', variant: 'fail' };
  }

  guardarFeedback(r: Resultado) {
    const fb = this.feedbackEdit[r.id] ?? '';
    this.servicio.guardarFeedback(r.id, fb).subscribe({
      next: () => this.snackBar.open('Feedback guardado.', 'OK', { duration: 2500 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }
}
