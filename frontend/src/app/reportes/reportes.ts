import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { Estudiante, Grupo, Materia } from '../core/models/academico.model';
import { Practica } from '../core/models/practicas.model';
import { AcademicoService } from '../core/services/academico.service';
import {
  ExtrasService,
  NotaRango,
  ReportesAnalitica,
  ReportesFiltros,
  ReportesResumen,
} from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';

interface CatalogoReporte {
  titulo: string;
  tipo: 'grupo' | 'materia' | 'estudiante' | 'proximamente';
}

@Component({
  selector: 'app-reportes',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  private readonly practicasSrv = inject(PracticasService);
  private readonly academico = inject(AcademicoService);
  private readonly extras = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly practicas = signal<Practica[]>([]);
  readonly resumen = signal<ReportesResumen | null>(null);
  readonly analitica = signal<ReportesAnalitica | null>(null);
  readonly materias = signal<Materia[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly estudiantes = signal<Estudiante[]>([]);
  readonly descargando = signal<string | null>(null);

  readonly catalogoReportes: CatalogoReporte[] = [
    { titulo: 'Reporte por grupo', tipo: 'grupo' },
    { titulo: 'Reporte por materia', tipo: 'materia' },
    { titulo: 'Reporte por estudiante', tipo: 'estudiante' },
    { titulo: 'Participación', tipo: 'proximamente' },
    { titulo: 'Desempeño', tipo: 'proximamente' },
    { titulo: 'Respuestas', tipo: 'proximamente' },
    { titulo: 'Tiempos', tipo: 'proximamente' },
    { titulo: 'Notas', tipo: 'proximamente' },
    { titulo: 'Retroalimentaciones', tipo: 'proximamente' },
    { titulo: 'Feedback', tipo: 'proximamente' },
  ];

  filtroDesde = '';
  filtroHasta = '';
  filtroMateriaId: number | null = null;
  filtroGrupoId: number | null = null;
  filtroEstudianteId: number | null = null;

  ngOnInit(): void {
    forkJoin({
      practicas: this.practicasSrv.listar(),
      materias: this.academico.listarMaterias(),
      grupos: this.academico.listarGrupos(),
      estudiantes: this.academico.listarEstudiantes(),
    }).subscribe({
      next: ({ practicas, materias, grupos, estudiantes }) => {
        this.practicas.set(practicas.results);
        this.materias.set(materias.results);
        this.grupos.set(grupos.results);
        this.estudiantes.set(estudiantes.results);
        this.cargarAgregados();
      },
      error: () => this.loading.set(false),
    });
  }

  filtrosActuales(): ReportesFiltros {
    return {
      desde: this.filtroDesde || undefined,
      hasta: this.filtroHasta || undefined,
      materia_id: this.filtroMateriaId ?? undefined,
      grupo_id: this.filtroGrupoId ?? undefined,
    };
  }

  aplicarFiltros(): void {
    this.cargarAgregados();
  }

  private cargarAgregados(): void {
    const filtros = this.filtrosActuales();
    forkJoin({
      resumen: this.extras.reportesResumen(filtros),
      analitica: this.extras.reportesAnalitica(filtros),
    }).subscribe({
      next: ({ resumen, analitica }) => {
        this.resumen.set(resumen);
        this.analitica.set(analitica);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  maxNotas(dist: NotaRango[]): number {
    return Math.max(1, ...dist.map((d) => d.cantidad));
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

  descargarCatalogoPDF(item: CatalogoReporte): void {
    const id = this.idCatalogo(item.tipo);
    if (!id) {
      this.snackBar.open('Selecciona un registro en los filtros superiores.', 'OK', { duration: 3500 });
      return;
    }
    const key = `${item.tipo}-${id}-pdf`;
    this.descargando.set(key);
    const obs = item.tipo === 'grupo'
      ? this.extras.descargarReporteGrupoPDF(id)
      : item.tipo === 'materia'
        ? this.extras.descargarReporteMateriaPDF(id)
        : this.extras.descargarReporteEstudiantePDF(id);
    obs.subscribe({
      next: (blob) => this.guardarBlob(blob, `reporte-${item.tipo}-${id}.pdf`),
      error: () => this.snackBar.open('No se pudo descargar el PDF.', 'OK', { duration: 3500 }),
      complete: () => this.descargando.set(null),
    });
  }

  descargarCatalogoExcel(item: CatalogoReporte): void {
    const id = this.idCatalogo(item.tipo);
    if (!id) {
      this.snackBar.open('Selecciona un registro en los filtros superiores.', 'OK', { duration: 3500 });
      return;
    }
    const key = `${item.tipo}-${id}-xlsx`;
    this.descargando.set(key);
    const obs = item.tipo === 'grupo'
      ? this.extras.descargarReporteGrupoExcel(id)
      : item.tipo === 'materia'
        ? this.extras.descargarReporteMateriaExcel(id)
        : this.extras.descargarReporteEstudianteExcel(id);
    obs.subscribe({
      next: (blob) => this.guardarBlob(blob, `reporte-${item.tipo}-${id}.xlsx`),
      error: () => this.snackBar.open('No se pudo descargar el Excel.', 'OK', { duration: 3500 }),
      complete: () => this.descargando.set(null),
    });
  }

  idCatalogo(tipo: CatalogoReporte['tipo']): number | null {
    if (tipo === 'grupo') return this.filtroGrupoId;
    if (tipo === 'materia') return this.filtroMateriaId;
    if (tipo === 'estudiante') return this.filtroEstudianteId;
    return null;
  }

  hintCatalogo(item: CatalogoReporte): string {
    if (item.tipo === 'grupo' && !this.filtroGrupoId) return 'Elige un grupo arriba';
    if (item.tipo === 'materia' && !this.filtroMateriaId) return 'Elige una materia arriba';
    if (item.tipo === 'estudiante' && !this.filtroEstudianteId) return 'Elige un estudiante arriba';
    if (item.tipo === 'proximamente') return 'Próximamente';
    return 'Listo para descargar';
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
