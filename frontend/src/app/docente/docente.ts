import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { AcademicoService } from '../core/services/academico.service';
import { CasosService } from '../core/services/casos.service';
import { PracticasService } from '../core/services/practicas.service';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  tag: string;
  num: string;
  variant: 'deep' | 'teal' | 'violet';
}

interface KpiCard {
  num: string;
  label: string;
  value: number | string;
  hint: string;
  icon: string;
  variant: 'deep' | 'teal' | 'violet';
}

@Component({
  selector: 'app-docente',
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressBarModule],
  templateUrl: './docente.html',
  styleUrl: './docente.scss',
})
export class Docente implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly academico = inject(AcademicoService);
  private readonly casosSrv = inject(CasosService);
  private readonly practicasSrv = inject(PracticasService);

  readonly loading = signal(true);

  readonly nombre = computed(
    () => this.auth.usuario()?.first_name || this.auth.usuario()?.username || 'docente',
  );

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly hoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  readonly estudiantesCount = signal<number | null>(null);
  readonly gruposCount = signal<number | null>(null);
  readonly casosCount = signal<number | null>(null);
  readonly practicasCount = signal<number | null>(null);

  readonly kpis = computed<KpiCard[]>(() => [
    { num: '01', label: 'Casos de estudio', value: this.casosCount() ?? '—', hint: 'Diseñados', icon: 'menu_book', variant: 'deep' },
    { num: '02', label: 'Prácticas',         value: this.practicasCount() ?? '—', hint: 'Activas', icon: 'event', variant: 'teal' },
    { num: '03', label: 'Estudiantes',       value: this.estudiantesCount() ?? '—', hint: 'Vinculados', icon: 'group', variant: 'violet' },
    { num: '04', label: 'Grupos',            value: this.gruposCount() ?? '—', hint: 'Organizados', icon: 'workspaces', variant: 'deep' },
  ]);

  readonly accesos: AccesoRapido[] = [
    { num: 'A', titulo: 'Crear caso',          descripcion: 'Diseña un caso desde cero con escenarios, preguntas y rúbrica.',
      icono: 'add_circle_outline', ruta: '/casos', tag: 'Contenido', variant: 'deep' },
    { num: 'B', titulo: 'Generar con IA',      descripcion: 'Crea un borrador de caso a partir de un tema y un objetivo.',
      icono: 'auto_awesome', ruta: '/ia-generativa', tag: 'Asistente IA', variant: 'teal' },
    { num: 'C', titulo: 'Importar documento',  descripcion: 'Convierte un PDF en un caso en revisión.',
      icono: 'upload_file', ruta: '/importacion-documentos', tag: 'Importar', variant: 'violet' },
    { num: 'D', titulo: 'Agendar práctica',    descripcion: 'Asigna estudiantes a una práctica con códigos de acceso.',
      icono: 'event', ruta: '/practicas', tag: 'Práctica', variant: 'deep' },
    { num: 'E', titulo: 'Revisar resultados',  descripcion: 'Notas, retroalimentación y desglose por criterio.',
      icono: 'assessment', ruta: '/resultados', tag: 'Analítica', variant: 'teal' },
    { num: 'F', titulo: 'Descargar reportes',  descripcion: 'PDF o Excel por práctica con datos completos.',
      icono: 'description', ruta: '/reportes', tag: 'Reportes', variant: 'violet' },
  ];

  ngOnInit(): void {
    forkJoin({
      estudiantes: this.academico.listarEstudiantes(),
      grupos: this.academico.listarGrupos(),
      casos: this.casosSrv.listarCasos(),
      practicas: this.practicasSrv.listar(),
    }).subscribe({
      next: ({ estudiantes, grupos, casos, practicas }) => {
        this.estudiantesCount.set(estudiantes.count);
        this.gruposCount.set(grupos.count);
        this.casosCount.set(casos.count);
        this.practicasCount.set(practicas.count);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
