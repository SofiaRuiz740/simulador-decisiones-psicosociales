import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Materia } from '../core/models/academico.model';
import { AcademicoService } from '../core/services/academico.service';
import { UxService } from '../core/services/ux.service';
import { mockupDialog } from '../shared/constants/dialog-config';
import { MateriaFormDialog } from './dialogs/materia-form-dialog';

@Component({
  selector: 'app-materias',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './materias.html',
  styleUrl: './materias.scss',
})
export class Materias implements OnInit {
  private readonly servicio = inject(AcademicoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly materias = signal<Materia[]>([]);

  readonly filtroTexto = signal('');
  readonly filtroEstado = signal<'' | 'activo' | 'inactivo'>('');

  readonly activas = computed(() => this.materias().filter((m) => m.activo).length);
  readonly totalGrupos = computed(() =>
    this.materias().reduce((acc, m) => acc + (m.grupos_count || 0), 0),
  );
  readonly totalEstudiantes = computed(() =>
    this.materias().reduce((acc, m) => acc + (m.estudiantes_count || 0), 0),
  );

  readonly filtradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const est = this.filtroEstado();
    return this.materias().filter((m) => {
      if (est === 'activo' && !m.activo) return false;
      if (est === 'inactivo' && m.activo) return false;
      if (!txt) return true;
      return (
        m.nombre.toLowerCase().includes(txt) ||
        (m.programa || '').toLowerCase().includes(txt) ||
        (m.periodo || '').toLowerCase().includes(txt)
      );
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.servicio.listarMaterias().subscribe({
      next: (resp) => {
        this.materias.set(resp.results);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar las materias.', 'OK', { duration: 3500 });
      },
    });
  }

  crear(): void {
    this.dialog.open(MateriaFormDialog, { ...mockupDialog('500px'), data: {} }).afterClosed()
      .subscribe((m) => {
        if (m) this.cargar();
      });
  }

  editar(materia: Materia): void {
    this.dialog.open(MateriaFormDialog, { ...mockupDialog('500px'), data: { materia } }).afterClosed()
      .subscribe((m) => {
        if (m) this.cargar();
      });
  }

  async eliminar(materia: Materia): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Eliminar materia',
      mensaje: `Se eliminará "${materia.nombre}". Los grupos asociados perderán su materia.`,
      variant: 'danger',
      textoConfirmar: 'Eliminar materia',
    });
    if (!ok) return;
    this.servicio.eliminarMateria(materia.id).subscribe({
      next: () => {
        this.snackBar.open(`Materia eliminada: ${materia.nombre}`, 'OK', { duration: 3000 });
        this.cargar();
      },
      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),
    });
  }
}
