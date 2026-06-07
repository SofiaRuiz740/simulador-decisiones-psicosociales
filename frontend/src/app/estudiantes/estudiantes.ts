import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Estudiante } from '../core/models/academico.model';
import { AcademicoService } from '../core/services/academico.service';
import { mockupDialog } from '../shared/constants/dialog-config';
import { AgregarPorCorreoDialog } from './dialogs/agregar-por-correo-dialog';
import { EstudianteFormDialog } from './dialogs/estudiante-form-dialog';

@Component({
  selector: 'app-estudiantes',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './estudiantes.html',
  styleUrl: './estudiantes.scss',
})
export class Estudiantes implements OnInit {
  private readonly servicio = inject(AcademicoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly estudiantes = signal<Estudiante[]>([]);
  readonly total = signal(0);
  readonly activos = computed(() => this.estudiantes().filter((e) => e.activo).length);
  readonly inactivos = computed(() => this.estudiantes().filter((e) => !e.activo).length);
  readonly sinGrupo = computed(() => this.estudiantes().filter((e) => e.sin_grupo).length);

  filtroTexto = '';
  filtroEstado: '' | 'activo' | 'inactivo' = '';

  readonly filtrados = computed(() => {
    const txt = this.filtroTexto.toLowerCase().trim();
    const est = this.filtroEstado;
    return this.estudiantes().filter((e) => {
      if (est === 'activo' && !e.activo) return false;
      if (est === 'inactivo' && e.activo) return false;
      if (!txt) return true;
      return (
        e.nombre_completo.toLowerCase().includes(txt) ||
        e.correo.toLowerCase().includes(txt)
      );
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.servicio.listarEstudiantes().subscribe({
      next: (resp) => {
        this.estudiantes.set(resp.results);
        this.total.set(resp.count);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los estudiantes.', 'OK', { duration: 3500 });
      },
    });
  }

  agregarPorCorreo(): void {
    this.dialog.open(AgregarPorCorreoDialog, mockupDialog('500px')).afterClosed()
      .subscribe((result) => {
        if (result) this.cargar();
      });
  }

  crear(): void {
    this.dialog.open(EstudianteFormDialog, { ...mockupDialog('500px'), data: {} }).afterClosed()
      .subscribe((result) => {
        if (result) this.cargar();
      });
  }

  editar(estudiante: Estudiante): void {
    this.dialog.open(EstudianteFormDialog, { ...mockupDialog('500px'), data: { estudiante } }).afterClosed()
      .subscribe((result) => {
        if (result) this.cargar();
      });
  }

  desvincular(estudiante: Estudiante): void {
    if (
      !confirm(
        `¿Desvincular a ${estudiante.nombre_completo} de tu lista? El estudiante seguirá existiendo en el sistema.`,
      )
    ) {
      return;
    }
    this.servicio.desvincularEstudiante(estudiante.id).subscribe({
      next: () => {
        this.snackBar.open(`Desvinculado: ${estudiante.correo}`, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: () =>
        this.snackBar.open('No se pudo desvincular.', 'OK', { duration: 3500 }),
    });
  }
}
