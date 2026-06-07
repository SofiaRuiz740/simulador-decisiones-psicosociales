import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Resultado, DetallePreguntaResultado } from '../core/models/practicas.model';
import { SimulacionService } from '../core/services/simulacion.service';

@Component({
  selector: 'app-resultados',
  imports: [
    CommonModule, FormsModule, DecimalPipe,
    MatProgressBarModule, MatSnackBarModule,
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
  readonly tab = signal<'lista' | 'feedback' | 'detalle' | 'retro'>('lista');
  readonly seleccionado = signal<Resultado | null>(null);
  readonly detalleResultado = signal<Resultado | null>(null);
  readonly retroResultado = signal<Resultado | null>(null);

  readonly tabs = [
    { id: 'lista' as const, label: 'Resultados' },
    { id: 'feedback' as const, label: 'Feedback docente' },
    { id: 'detalle' as const, label: 'Detalle respuestas' },
    { id: 'retro' as const, label: 'Retroalimentación final' },
  ];

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
    const r = this.resultados().find((x) => x.id === id);
    if (r) this.abrirFeedback(r);
  }

  setTab(id: 'lista' | 'feedback' | 'detalle' | 'retro') {
    this.tab.set(id);
  }

  abrirFeedback(r: Resultado) {
    this.seleccionado.set(r);
    this.tab.set('feedback');
  }

  abrirDetalle(r: Resultado) {
    this.detalleResultado.set(r);
    this.tab.set('detalle');
  }

  abrirRetro(r: Resultado) {
    this.retroResultado.set(r);
    this.tab.set('retro');
  }

  puntajeLabel(r: Resultado): string {
    if (!r.peso_total) return '—';
    return `${r.peso_obtenido}/${r.peso_total}`;
  }

  esAcertada(d: DetallePreguntaResultado): boolean {
    if (!d.respondida || !d.respuesta_elegida) return false;
    return d.respuestas_correctas.some((rc) => rc.id === d.respuesta_elegida!.id);
  }

  guardarFeedback(r: Resultado) {
    const fb = this.feedbackEdit[r.id] ?? '';
    this.servicio.guardarFeedback(r.id, fb).subscribe({
      next: () => this.snackBar.open('Feedback guardado.', 'OK', { duration: 2500 }),
      error: () => this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 }),
    });
  }
}
