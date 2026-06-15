import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SolicitudReapertura } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';
import { UxService } from '../core/services/ux.service';

@Component({
  selector: 'app-solicitudes-reapertura',
  imports: [DatePipe, NgClass, MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule],
  templateUrl: './solicitudes-reapertura.html',
  styleUrl: './solicitudes-reapertura.scss',
})
export class SolicitudesReaperturaPage implements OnInit {
  private readonly practicas = inject(PracticasService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

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

  async rechazar(sol: SolicitudReapertura): Promise<void> {
    const mensaje = await this.ux.askInput({
      titulo: 'Rechazar solicitud',
      mensaje: 'Puedes incluir un mensaje breve para el estudiante explicando el motivo.',
      label: 'Mensaje (opcional)',
      placeholder: 'Ej: La práctica ya cerró y no puede reabrirse.',
      icono: 'cancel',
      multiline: true,
      rows: 3,
      maxlength: 300,
    });
    if (mensaje === null) return; // canceló
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
