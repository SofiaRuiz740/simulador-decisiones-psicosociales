import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Estudiante } from '../core/models/academico.model';
import { AcademicoService } from '../core/services/academico.service';
import { UxService } from '../core/services/ux.service';
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
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly estudiantes = signal<Estudiante[]>([]);
  readonly total = signal(0);
  readonly activos = computed(() => this.estudiantes().filter((e) => e.activo).length);
  readonly inactivos = computed(() => this.estudiantes().filter((e) => !e.activo).length);
  readonly sinGrupo = computed(() => this.estudiantes().filter((e) => e.sin_grupo).length);

  readonly filtroTexto = signal('');
  readonly filtroEstado = signal<'' | 'activo' | 'inactivo'>('');

  readonly filtrados = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();
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

  async desvincular(estudiante: Estudiante): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Desvincular estudiante',
      mensaje: `${estudiante.nombre_completo} dejará de aparecer en tu lista personal. La cuenta del estudiante se conserva en el sistema.`,
      variant: 'warn',
      textoConfirmar: 'Desvincular',
      icono: 'link_off',
    });
    if (!ok) return;
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
