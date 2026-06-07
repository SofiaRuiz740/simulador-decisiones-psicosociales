import { CommonModule, DatePipe } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormsModule } from '@angular/forms';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Router, RouterLink } from '@angular/router';



import { CasoListItem, EstadoCaso } from '../core/models/casos.model';

import { EstadoPractica, Practica } from '../core/models/practicas.model';

import { CasosService } from '../core/services/casos.service';

import { PracticasService } from '../core/services/practicas.service';

import { mockupDialog } from '../shared/constants/dialog-config';
import { PracticaFormDialog } from './dialogs/practica-form-dialog';



@Component({

  selector: 'app-practicas',

  imports: [

    CommonModule,

    DatePipe,

    FormsModule,

    ReactiveFormsModule,

    RouterLink,

    MatDialogModule,

    MatProgressBarModule,

    MatSnackBarModule,

  ],

  templateUrl: './practicas.html',

  styleUrl: './practicas.scss',

})

export class Practicas implements OnInit {

  private readonly servicio = inject(PracticasService);

  private readonly casosSrv = inject(CasosService);

  private readonly fb = inject(FormBuilder);

  private readonly dialog = inject(MatDialog);

  private readonly snackBar = inject(MatSnackBar);

  private readonly router = inject(Router);



  readonly loading = signal(true);

  readonly guardando = signal(false);

  readonly cargandoCasos = signal(true);

  readonly practicas = signal<Practica[]>([]);

  readonly casos = signal<CasoListItem[]>([]);

  readonly tab = signal('agenda');

  filtroTexto = '';

  filtroEstado: EstadoPractica | '' = '';



  readonly formNueva = this.fb.nonNullable.group({

    nombre: ['', Validators.required],

    caso: [null as number | null, Validators.required],

    fecha_inicio: ['', Validators.required],

    fecha_fin: ['', Validators.required],

    tiempo_max_min: [30],

    lugar_fisico: [''],

    mensaje_personalizado: [''],

  });



  readonly tabs = [

    { id: 'agenda', label: 'Agenda' },

    { id: 'nueva', label: 'Nueva práctica' },

    { id: 'participantes', label: 'Participantes' },

    { id: 'codigos', label: 'Códigos de acceso' },

    { id: 'seguimiento', label: 'Seguimiento' },

    { id: 'historial', label: 'Historial' },

  ];





  readonly casosValidados = computed(() =>

    this.casos().filter((c) => c.estado === EstadoCaso.Validado),

  );



  readonly filtradas = computed(() => {

    const txt = this.filtroTexto.toLowerCase().trim();

    const est = this.filtroEstado;

    return this.practicas().filter((p) => {

      if (est && p.estado !== est) return false;

      if (!txt) return true;

      return (

        p.nombre.toLowerCase().includes(txt) ||

        (p.caso_nombre || '').toLowerCase().includes(txt)

      );

    });

  });



  contar(estado: string): number {

    return this.practicas().filter((p) => p.estado === estado).length;

  }



  badgeClass(estado: EstadoPractica): string {

    switch (estado) {

      case EstadoPractica.SinIniciar: return 'badge badge--sin-iniciar';

      case EstadoPractica.EnCurso: return 'badge badge--en-curso';

      case EstadoPractica.Finalizada: return 'badge badge--finalizado';

      case EstadoPractica.Cancelada: return 'badge badge--cancelado';

      default: return 'badge';

    }

  }



  ngOnInit() {

    this.cargar();

    this.cargarCasos();

  }



  cargar() {

    this.loading.set(true);

    this.servicio.listar().subscribe({

      next: (r) => { this.practicas.set(r.results); this.loading.set(false); },

      error: () => {

        this.loading.set(false);

        this.snackBar.open('No se pudieron cargar las prácticas.', 'OK', { duration: 3500 });

      },

    });

  }



  cargarCasos() {

    this.casosSrv.listarCasos().subscribe({

      next: (r) => {

        this.casos.set(r.results);

        this.cargandoCasos.set(false);

        const validados = r.results.filter((c) => c.estado === EstadoCaso.Validado);

        if (validados.length) this.formNueva.patchValue({ caso: validados[0].id });

      },

      error: () => this.cargandoCasos.set(false),

    });

  }



  crear() {

    this.dialog.open(PracticaFormDialog, mockupDialog('600px')).afterClosed().subscribe((p) => {

      if (p) { this.cargar(); this.router.navigate(['/practicas', p.id]); }

    });

  }



  agendarInline() {

    if (this.formNueva.invalid || this.guardando() || this.casosValidados().length === 0) return;

    this.guardando.set(true);

    const v = this.formNueva.getRawValue();

    const payload = {

      nombre: v.nombre,

      caso: v.caso as number,

      fecha_inicio: new Date(v.fecha_inicio).toISOString(),

      fecha_fin: new Date(v.fecha_fin).toISOString(),

      tiempo_max_min: v.tiempo_max_min,

      lugar_fisico: v.lugar_fisico,

      mensaje_personalizado: v.mensaje_personalizado,

    };

    this.servicio.crear(payload).subscribe({

      next: (p) => {

        this.guardando.set(false);

        this.snackBar.open('Práctica agendada.', 'OK', { duration: 2500 });

        this.formNueva.reset({ tiempo_max_min: 30, caso: this.casosValidados()[0]?.id ?? null });

        this.cargar();

        this.router.navigate(['/practicas', p.id]);

      },

      error: () => {

        this.guardando.set(false);

        this.snackBar.open('No se pudo agendar la práctica.', 'OK', { duration: 3500 });

      },

    });

  }



  eliminar(p: Practica, ev: Event) {

    ev.preventDefault();

    ev.stopPropagation();

    if (!confirm(`¿Eliminar la práctica "${p.nombre}"? Se borrarán las autorizaciones y participaciones.`)) return;

    this.servicio.eliminar(p.id).subscribe({

      next: () => { this.snackBar.open('Práctica eliminada.', 'OK', { duration: 2500 }); this.cargar(); },

      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),

    });

  }

}

