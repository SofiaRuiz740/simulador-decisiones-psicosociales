import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  EstadoPropuestaIA,
  PropuestaCasoIA,
} from '../core/models/ia.model';
import { IaService } from '../core/services/ia.service';
import { UxService } from '../core/services/ux.service';
import { GamePreview } from './components/game-preview/game-preview';
import { RechazarPropuestaDialog } from './dialogs/rechazar-propuesta-dialog';
import { mockupDialog } from '../shared/constants/dialog-config';

@Component({
  selector: 'app-propuesta-detalle',
  imports: [
    CommonModule, RouterLink,
    MatProgressBarModule, MatSnackBarModule,
    MatDialogModule,
    GamePreview,
  ],
  templateUrl: './propuesta-detalle.html',
  styleUrl: './propuesta-detalle.scss',
})
export class PropuestaDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ia = inject(IaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly propuesta = signal<PropuestaCasoIA | null>(null);

  readonly puedeEditar = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.EnRevision
        || p.estado === EstadoPropuestaIA.Aprobado;
  });

  readonly puedeAprobar = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.EnRevision;
  });

  readonly puedeRechazar = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.EnRevision
        || p.estado === EstadoPropuestaIA.Aprobado;
  });

  readonly puedeConvertir = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.Aprobado
        || p.estado === EstadoPropuestaIA.EnRevision;
  });

  badgeClass(estado: EstadoPropuestaIA): string {
    switch (estado) {
      case EstadoPropuestaIA.Borrador: return 'badge badge--borrador';
      case EstadoPropuestaIA.EnRevision: return 'badge badge--en-revision';
      case EstadoPropuestaIA.Aprobado: return 'badge badge--validado';
      case EstadoPropuestaIA.Rechazado: return 'badge badge--cancelado';
      case EstadoPropuestaIA.ConvertidoEnCaso: return 'badge badge--aprobado';
      default: return 'badge';
    }
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/ia-generativa']); return; }
    this.cargar(id);
  }

  cargar(id: number): void {
    this.loading.set(true);
    this.ia.obtenerPropuesta(id).subscribe({
      next: (p) => { this.propuesta.set(p); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar la propuesta.', 'OK', { duration: 3500 });
        this.router.navigate(['/ia-generativa']);
      },
    });
  }

  aprobar(): void {
    const p = this.propuesta();
    if (!p) return;
    this.ia.aprobarPropuesta(p.id).subscribe({
      next: (actualizada) => {
        this.propuesta.set(actualizada);
        this.snackBar.open('Propuesta aprobada.', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo aprobar.', 'OK', { duration: 3500 }),
    });
  }

  rechazar(): void {
    const p = this.propuesta();
    if (!p) return;
    this.dialog.open(RechazarPropuestaDialog, mockupDialog('480px')).afterClosed().subscribe((res) => {
      if (!res) return;
      this.ia.rechazarPropuesta(p.id, res.motivo).subscribe({
        next: (actualizada) => {
          this.propuesta.set(actualizada);
          this.snackBar.open('Propuesta rechazada.', 'OK', { duration: 2500 });
        },
        error: () => this.snackBar.open('No se pudo rechazar.', 'OK', { duration: 3500 }),
      });
    });
  }

  async convertir(): Promise<void> {
    const p = this.propuesta();
    if (!p) return;
    const ok = await this.ux.confirm({
      titulo: 'Convertir en caso editable',
      mensaje: 'Se creará un caso nuevo en estado "En revisión" dentro de Casos. Podrás ajustar el contenido antes de publicarlo.',
      variant: 'info',
      textoConfirmar: 'Convertir',
      icono: 'auto_awesome',
    });
    if (!ok) return;
    this.ia.convertirEnCaso(p.id).subscribe({
      next: (res) => {
        this.snackBar.open(`Caso creado: "${res.caso_nombre}".`, 'Abrir', { duration: 4500 })
          .onAction().subscribe(() => this.router.navigate(['/casos', res.caso_id]));
        this.propuesta.set(res.propuesta);
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.detail || 'No se pudo convertir en caso.',
          'OK', { duration: 4000 },
        );
      },
    });
  }
}
