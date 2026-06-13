import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Practica, RegistroReinicio } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-reinicio-practicas',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './reinicio-practicas.html',
  styleUrl: './reinicio-practicas.scss',
})
export class ReinicioPracticasPage implements OnInit {
  private readonly practicasSvc = inject(PracticasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly procesando = signal(false);
  readonly practicas = signal<Practica[]>([]);
  readonly registros = signal<RegistroReinicio[]>([]);
  readonly practicaSeleccionada = signal<number | null>(null);
  readonly autorizacionSeleccionada = signal<number | null>(null);
  readonly motivo = signal('');
  readonly confirmacionIndividual = signal('');
  readonly confirmacionGlobal = signal('');

  ngOnInit(): void {
    this.practicasSvc.listar().subscribe({
      next: (r) => {
        this.practicas.set(r.results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    this.practicasSvc.listarRegistrosReinicio().subscribe({
      next: (rows) => this.registros.set(rows),
    });
  }

  practicaDetalle(): Practica | undefined {
    const id = this.practicaSeleccionada();
    return id ? this.practicas().find((p) => p.id === id) : undefined;
  }

  reiniciarIndividual(): void {
    const practicaId = this.practicaSeleccionada();
    const authId = this.autorizacionSeleccionada();
    if (!practicaId || !authId) {
      this.snackBar.open('Selecciona práctica y autorización.', 'OK', { duration: 3000 });
      return;
    }
    if (this.confirmacionIndividual().trim().toUpperCase() !== 'REINICIAR') {
      this.snackBar.open('Escribe REINICIAR para confirmar.', 'OK', { duration: 3000 });
      return;
    }

    this.procesando.set(true);
    this.practicasSvc.reiniciarEstudiante(practicaId, authId, this.motivo()).subscribe({
      next: () => {
        this.snackBar.open('Práctica reiniciada para el estudiante.', 'OK', { duration: 3500 });
        this.confirmacionIndividual.set('');
        this.procesando.set(false);
        this.cargarRegistros();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.confirmacion?.[0] ?? err?.error?.detail ?? 'Error al reiniciar.', 'OK', {
          duration: 4000,
        });
        this.procesando.set(false);
      },
    });
  }

  reiniciarGlobal(): void {
    const practicaId = this.practicaSeleccionada();
    if (!practicaId) {
      this.snackBar.open('Selecciona una práctica.', 'OK', { duration: 3000 });
      return;
    }
    if (this.confirmacionGlobal().trim().toUpperCase() !== 'REINICIAR TODOS') {
      this.snackBar.open('Escribe REINICIAR TODOS para confirmar.', 'OK', { duration: 3000 });
      return;
    }

    this.procesando.set(true);
    this.practicasSvc.reiniciarTodos(practicaId, this.motivo()).subscribe({
      next: (res) => {
        this.snackBar.open(res.detail, 'OK', { duration: 4000 });
        this.confirmacionGlobal.set('');
        this.procesando.set(false);
        this.cargarRegistros();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.confirmacion?.[0] ?? err?.error?.detail ?? 'Error al reiniciar.', 'OK', {
          duration: 4000,
        });
        this.procesando.set(false);
      },
    });
  }

  cargarAutorizaciones(): void {
    const id = this.practicaSeleccionada();
    if (!id) return;
    this.practicasSvc.obtener(id).subscribe({
      next: (det) => {
        if (det.autorizaciones.length > 0 && !this.autorizacionSeleccionada()) {
          this.autorizacionSeleccionada.set(det.autorizaciones[0].id);
        }
      },
    });
  }
}
