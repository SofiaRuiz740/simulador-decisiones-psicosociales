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
  ReporteTematicoTipo,
  ReportesAnalitica,
  ReportesFiltros,
  ReportesResumen,
} from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';

interface CatalogoReporte {
  titulo: string;
  tipo: 'grupo' | 'materia' | 'estudiante' | 'tematico';
  /** Slug del reporte temático (solo cuando tipo === 'tematico'). */
  tematicoTipo?: ReporteTematicoTipo;
  /** Descripción corta para mostrar al docente. */
  descripcion?: string;
  /** Icono Material referido en el HTML. */
  icono?: string;
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
    { titulo: 'Reporte por grupo', tipo: 'grupo',
      descripcion: 'Resultados consolidados de un grupo seleccionado.', icono: 'groups' },
    { titulo: 'Reporte por materia', tipo: 'materia',
      descripcion: 'Resultados de todas las prácticas de una materia.', icono: 'menu_book' },
    { titulo: 'Reporte por estudiante', tipo: 'estudiante',
      descripcion: 'Histórico de prácticas de un estudiante.', icono: 'person' },
    { titulo: 'Participación', tipo: 'tematico', tematicoTipo: 'participacion',
      descripcion: 'Cobertura de respuestas por estudiante y práctica.', icono: 'how_to_reg' },
    { titulo: 'Desempeño', tipo: 'tematico', tematicoTipo: 'desempeno',
      descripcion: 'Promedio por criterio de rúbrica.', icono: 'leaderboard' },
    { titulo: 'Respuestas', tipo: 'tematico', tematicoTipo: 'respuestas',
      descripcion: 'Correctas, incorrectas y sin responder por estudiante.', icono: 'fact_check' },
    { titulo: 'Tiempos', tipo: 'tematico', tematicoTipo: 'tiempos',
      descripcion: 'Duración vs tiempo máximo permitido.', icono: 'timer' },
    { titulo: 'Notas', tipo: 'tematico', tematicoTipo: 'notas',
      descripcion: 'Notas finales y distribución por rangos.', icono: 'grading' },
    { titulo: 'Retroalimentaciones', tipo: 'tematico', tematicoTipo: 'retroalimentaciones',
      descripcion: 'Feedback ya entregado por el docente.', icono: 'reviews' },
    { titulo: 'Feedback pendiente', tipo: 'tematico', tematicoTipo: 'feedback',
      descripcion: 'Resultados esperando retroalimentación del docente.', icono: 'pending_actions' },
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
      estudiante_id: this.filtroEstudianteId ?? undefined,
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
    this.descargarCatalogo(item, 'pdf');
  }

  descargarCatalogoExcel(item: CatalogoReporte): void {
    this.descargarCatalogo(item, 'excel');
  }

  private descargarCatalogo(item: CatalogoReporte, formato: 'pdf' | 'excel'): void {
    if (item.tipo === 'tematico' && item.tematicoTipo) {
      const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
      const key = `${item.tematicoTipo}-${formato}`;
      this.descargando.set(key);
      this.extras.descargarReporteTematico(item.tematicoTipo, formato, this.filtrosActuales())
        .subscribe({
          next: (blob) => this.guardarBlob(blob, `reporte-${item.tematicoTipo}.${ext}`),
          error: () => this.snackBar.open(
            `No se pudo descargar el ${formato.toUpperCase()}.`, 'OK', { duration: 3500 },
          ),
          complete: () => this.descargando.set(null),
        });
      return;
    }

    const id = this.idCatalogo(item.tipo);
    if (!id) {
      this.snackBar.open(
        'Selecciona un registro en los filtros superiores.', 'OK', { duration: 3500 },
      );
      return;
    }
    const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
    const key = `${item.tipo}-${id}-${formato}`;
    this.descargando.set(key);
    const obs = formato === 'pdf'
      ? (item.tipo === 'grupo' ? this.extras.descargarReporteGrupoPDF(id)
        : item.tipo === 'materia' ? this.extras.descargarReporteMateriaPDF(id)
        : this.extras.descargarReporteEstudiantePDF(id))
      : (item.tipo === 'grupo' ? this.extras.descargarReporteGrupoExcel(id)
        : item.tipo === 'materia' ? this.extras.descargarReporteMateriaExcel(id)
        : this.extras.descargarReporteEstudianteExcel(id));
    obs.subscribe({
      next: (blob) => this.guardarBlob(blob, `reporte-${item.tipo}-${id}.${ext}`),
      error: () => this.snackBar.open(
        `No se pudo descargar el ${formato.toUpperCase()}.`, 'OK', { duration: 3500 },
      ),
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
    if (item.tipo === 'tematico') return item.descripcion || 'Aplica los filtros y descarga.';
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
