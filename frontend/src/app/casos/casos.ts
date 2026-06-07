import { CommonModule } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Router, RouterLink } from '@angular/router';



import { CasoListItem, EstadoCaso } from '../core/models/casos.model';

import { CasosService } from '../core/services/casos.service';

import { AcademicoService } from '../core/services/academico.service';

import { Materia } from '../core/models/academico.model';

import { mockupDialog } from '../shared/constants/dialog-config';

import { CasoFormDialog } from './dialogs/caso-form-dialog';



@Component({

  selector: 'app-casos',

  imports: [

    CommonModule,

    FormsModule,

    ReactiveFormsModule,

    RouterLink,

    MatDialogModule,

    MatProgressBarModule,

    MatSnackBarModule,

  ],

  templateUrl: './casos.html',

  styleUrl: './casos.scss',

})

export class Casos implements OnInit {

  private readonly servicio = inject(CasosService);

  private readonly academico = inject(AcademicoService);

  private readonly fb = inject(FormBuilder);

  private readonly dialog = inject(MatDialog);

  private readonly snackBar = inject(MatSnackBar);

  private readonly router = inject(Router);



  readonly loading = signal(true);

  readonly guardando = signal(false);

  readonly casos = signal<CasoListItem[]>([]);

  readonly vista = signal<'banco' | 'crear' | 'editar'>('banco');

  readonly casoSeleccionado = signal<CasoListItem | null>(null);

  readonly materias = signal<Materia[]>([]);

  filtroTexto = '';

  filtroEstado: EstadoCaso | '' = '';



  readonly formCrear = this.fb.nonNullable.group({

    nombre: ['', [Validators.required, Validators.maxLength(200)]],

    descripcion: [''],

    area_psicosocial: ['', Validators.maxLength(150)],

    tiempo_estimado_min: [30, [Validators.required, Validators.min(1)]],

    materia: [null as number | null],

  });



  readonly filtrados = computed(() => {

    const txt = (this.filtroTexto || '').toLowerCase().trim();

    const est = this.filtroEstado;

    return this.casos().filter((c) => {

      if (est && c.estado !== est) return false;

      if (!txt) return true;

      return (

        c.nombre.toLowerCase().includes(txt) ||

        (c.area_psicosocial || '').toLowerCase().includes(txt) ||

        (c.descripcion || '').toLowerCase().includes(txt)

      );

    });

  });



  contarPorEstado(est: string): number {

    return this.casos().filter((c) => c.estado === est).length;

  }



  badgeClass(estado: EstadoCaso): string {

    switch (estado) {

      case 'VALIDADO': return 'badge badge--validado';

      case 'BORRADOR': return 'badge badge--borrador';

      case 'EN_REVISION': return 'badge badge--en-revision';

      case 'ARCHIVADO': return 'badge badge--archivado';

      default: return 'badge';

    }

  }



  ngOnInit() {
    this.cargar();
    this.academico.listarMaterias().subscribe({
      next: (resp) => this.materias.set(resp.results.filter((m) => m.activo)),
    });
  }



  cargar() {

    this.loading.set(true);

    this.servicio.listarCasos().subscribe({

      next: (resp) => { this.casos.set(resp.results); this.loading.set(false); },

      error: () => { this.loading.set(false); this.snackBar.open('No se pudieron cargar los casos.', 'OK', { duration: 3500 }); },

    });

  }



  irCrear(): void {

    this.vista.set('crear');

  }



  irEditar(c?: CasoListItem): void {

    if (c) this.casoSeleccionado.set(c);

    this.vista.set('editar');

  }



  crearInline(): void {

    if (this.formCrear.invalid || this.guardando()) return;

    this.guardando.set(true);

    this.servicio.crearCaso(this.formCrear.getRawValue()).subscribe({

      next: (c) => {

        this.guardando.set(false);

        this.formCrear.reset({ tiempo_estimado_min: 30 });

        this.cargar();

        this.router.navigate(['/casos', c.id]);

      },

      error: () => {

        this.guardando.set(false);

        this.snackBar.open('No se pudo crear el caso.', 'OK', { duration: 3500 });

      },

    });

  }



  crear() {

    this.irCrear();

  }



  editar(c: CasoListItem) {

    this.irEditar(c);

  }



  editarMetadatos(c: CasoListItem) {

    this.dialog.open(CasoFormDialog, { ...mockupDialog(), data: { caso: c } }).afterClosed().subscribe((r) => {

      if (r) {

        this.cargar();

        if (this.casoSeleccionado()?.id === c.id) this.casoSeleccionado.set(r);

      }

    });

  }



  materiaLabel(c: CasoListItem): string {

    return c.materia_display?.trim() || '—';

  }



  preguntasLabel(c: CasoListItem): string {

    return String(c.preguntas_count ?? 0);

  }



  rubricaLabel(c: CasoListItem): string {

    if (!c.tiene_rubrica) return '—';

    return c.rubrica_resumen?.trim() || 'Sí';

  }



  completitud(c: CasoListItem): string {

    return `${c.completitud_pct ?? 0}%`;

  }



  eliminar(c: CasoListItem) {

    if (!confirm(`¿Eliminar el caso "${c.nombre}"? Se borrarán escenarios, preguntas y respuestas.`)) return;

    this.servicio.eliminarCaso(c.id).subscribe({

      next: () => { this.snackBar.open('Caso eliminado.', 'OK', { duration: 2500 }); this.cargar(); },

      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),

    });

  }

}

