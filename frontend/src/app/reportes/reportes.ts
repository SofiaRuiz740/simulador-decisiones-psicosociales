import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Practica } from '../core/models/practicas.model';
import { ExtrasService } from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-reportes',
  imports: [
    CommonModule,
    DatePipe,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  private readonly practicasSrv = inject(PracticasService);
  private readonly extras = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly practicas = signal<Practica[]>([]);
  readonly descargando = signal<string | null>(null);

  readonly catalogoReportes = [
    'Reporte por grupo',
    'Reporte por materia',
    'Reporte por estudiante',
    'Participación',
    'Desempeño',
    'Respuestas',
    'Tiempos',
    'Notas',
    'Retroalimentaciones',
    'Feedback',
  ];

  readonly totalPracticas = computed(() => this.practicas().length);
  readonly conAutorizados = computed(() => this.practicas().filter((p) => p.autorizaciones_count > 0).length);
  readonly finalizadas = computed(() => this.practicas().filter((p) => p.estado === 'FINALIZADA').length);

  ngOnInit(): void {
    this.practicasSrv.listar().subscribe({
      next: (r) => { this.practicas.set(r.results); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  descargarPDF(p: Practica): void {
    const key = `${p.id}-pdf`;
    this.descargando.set(key);
    this.extras.descargarReportePracticaPDF(p.id).subscribe({
      next: (blob) => this.guardarBlob(blob, `reporte-${p.id}.pdf`),
      error: () => this.snackBar.open('No se pudo descargar el PDF.', 'OK', { duration: 3500 }),
      complete: () => this.descargando.set(null),
    });
  }

  descargarExcel(p: Practica): void {
    const key = `${p.id}-xlsx`;
    this.descargando.set(key);
    this.extras.descargarReportePracticaExcel(p.id).subscribe({
      next: (blob) => this.guardarBlob(blob, `reporte-${p.id}.xlsx`),
      error: () => this.snackBar.open('No se pudo descargar el Excel.', 'OK', { duration: 3500 }),
      complete: () => this.descargando.set(null),
    });
  }

  private guardarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Descarga iniciada.', 'OK', { duration: 2500 });
  }
}
