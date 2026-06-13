import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SolicitudReapertura } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-solicitudes-reapertura',
  imports: [DatePipe, NgClass, MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule],
  templateUrl: './solicitudes-reapertura.html',
  styleUrl: './solicitudes-reapertura.scss',
})
export class SolicitudesReaperturaPage implements OnInit {
  private readonly practicas = inject(PracticasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly procesando = signal<number | null>(null);
  readonly solicitudes = signal<SolicitudReapertura[]>([]);
  readonly filtro = signal<'TODAS' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'>('TODAS');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.practicas.listarSolicitudesReapertura().subscribe({
      next: (rows) => {
        this.solicitudes.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('No se pudieron cargar las solicitudes.', 'OK', { duration: 3500 });
        this.loading.set(false);
      },
    });
  }

  filtradas(): SolicitudReapertura[] {
    const f = this.filtro();
    if (f === 'TODAS') return this.solicitudes();
    return this.solicitudes().filter((s) => s.estado === f);
  }

  aprobar(sol: SolicitudReapertura): void {
    this.procesando.set(sol.id);
    this.practicas.aprobarSolicitudReapertura(sol.id).subscribe({
      next: () => {
        this.snackBar.open('Solicitud aprobada. La práctica fue reiniciada para el estudiante.', 'OK', {
          duration: 4000,
        });
        this.procesando.set(null);
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.detail ?? 'No se pudo aprobar.', 'OK', { duration: 3500 });
        this.procesando.set(null);
      },
    });
  }

  rechazar(sol: SolicitudReapertura): void {
    const mensaje = window.prompt('Mensaje opcional para el estudiante:') ?? '';
    this.procesando.set(sol.id);
    this.practicas.rechazarSolicitudReapertura(sol.id, mensaje).subscribe({
      next: () => {
        this.snackBar.open('Solicitud rechazada.', 'OK', { duration: 3000 });
        this.procesando.set(null);
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.detail ?? 'No se pudo rechazar.', 'OK', { duration: 3500 });
        this.procesando.set(null);
      },
    });
  }

  badgeClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'badge badge--pendiente';
      case 'APROBADA':
        return 'badge badge--finalizado';
      case 'RECHAZADA':
        return 'badge badge--cancelada';
      default:
        return 'badge';
    }
  }
}
