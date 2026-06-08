import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Grupo } from '../core/models/academico.model';
import { AcademicoService } from '../core/services/academico.service';
import { UxService } from '../core/services/ux.service';
import { mockupDialog } from '../shared/constants/dialog-config';
import { GrupoFormDialog } from './dialogs/grupo-form-dialog';

@Component({
  selector: 'app-grupos',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './grupos.html',
  styleUrl: './grupos.scss',
})
export class Grupos implements OnInit {
  private readonly servicio = inject(AcademicoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly grupos = signal<Grupo[]>([]);
  readonly grupoExpandidoId = signal<number | null>(null);
  readonly detalle = signal<import('../core/models/academico.model').GrupoDetalle | null>(null);

  readonly filtroTexto = signal('');

  readonly filtrados = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    if (!txt) return this.grupos();
    return this.grupos().filter((g) =>
      g.nombre.toLowerCase().includes(txt) ||
      (g.descripcion || '').toLowerCase().includes(txt),
    );
  });

  readonly totalEstudiantes = computed(() =>
    this.grupos().reduce((acc, g) => acc + (g.estudiantes_count || 0), 0),
  );

  readonly gruposVacios = computed(() => this.grupos().filter((g) => !g.estudiantes_count).length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.servicio.listarGrupos().subscribe({
      next: (resp) => {
        this.grupos.set(resp.results);
        this.loading.set(false);
        // Si había un grupo expandido, refrescar su detalle.
        const id = this.grupoExpandidoId();
        if (id) this.cargarDetalle(id);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los grupos.', 'OK', { duration: 3500 });
      },
    });
  }

  cargarDetalle(id: number): void {
    this.servicio.obtenerGrupo(id).subscribe((g) => this.detalle.set(g));
  }

  expandir(g: Grupo): void {
    if (this.grupoExpandidoId() === g.id) {
      this.grupoExpandidoId.set(null);
      this.detalle.set(null);
    } else {
      this.grupoExpandidoId.set(g.id);
      this.cargarDetalle(g.id);
    }
  }

  crear(): void {
    this.dialog.open(GrupoFormDialog, { ...mockupDialog('500px'), data: {} }).afterClosed()
      .subscribe((g) => {
        if (g) this.cargar();
      });
  }

  editar(g: Grupo, ev: Event): void {
    ev.stopPropagation();
    this.dialog.open(GrupoFormDialog, { ...mockupDialog('500px'), data: { grupo: g } }).afterClosed()
      .subscribe((res) => {
        if (res) this.cargar();
      });
  }

  async eliminar(g: Grupo, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.ux.confirm({
      titulo: 'Eliminar grupo',
      mensaje: `Se eliminará el grupo "${g.nombre}". Los estudiantes no se borran, pero perderán la vinculación a este grupo.`,
      variant: 'danger',
      textoConfirmar: 'Eliminar grupo',
    });
    if (!ok) return;
    this.servicio.eliminarGrupo(g.id).subscribe({
      next: () => {
        this.snackBar.open(`Grupo eliminado: ${g.nombre}`, 'OK', { duration: 3000 });
        if (this.grupoExpandidoId() === g.id) {
          this.grupoExpandidoId.set(null);
          this.detalle.set(null);
        }
        this.cargar();
      },
      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),
    });
  }

  async agregarEstudiantes(): Promise<void> {
    const detalle = this.detalle();
    if (!detalle) return;
    const { AgregarEstudiantesDialog } = await import(
      './dialogs/agregar-estudiantes-dialog'
    );
    this.dialog
      .open(AgregarEstudiantesDialog, { ...mockupDialog('500px'), data: { grupo: detalle } })
      .afterClosed()
      .subscribe((g) => {
        if (g) {
          this.detalle.set(g);
          this.cargar();
        }
      });
  }

  async removerEstudiante(estudianteId: number): Promise<void> {
    const detalle = this.detalle();
    if (!detalle) return;
    const ok = await this.ux.confirm({
      titulo: 'Remover estudiante',
      mensaje: 'El estudiante saldrá de este grupo. Su cuenta y su historial se conservan.',
      variant: 'warn',
      textoConfirmar: 'Remover',
      icono: 'person_remove',
    });
    if (!ok) return;
    this.servicio
      .removerEstudiantesDeGrupo(detalle.id, [estudianteId])
      .subscribe({
        next: (g) => {
          this.detalle.set(g);
          this.cargar();
        },
      });
  }
}
