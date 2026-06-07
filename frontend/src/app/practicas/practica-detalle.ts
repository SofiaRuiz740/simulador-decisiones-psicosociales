import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { mockupDialog } from '../shared/constants/dialog-config';
import { CorreoInvitacionesDialog } from '../shared/dialogs/correo-invitaciones-dialog';

import { Estudiante, Grupo } from '../core/models/academico.model';
import { EstadoPractica, PracticaDetalle, SeguimientoParticipacion } from '../core/models/practicas.model';
import { AcademicoService } from '../core/services/academico.service';
import { ExtrasService } from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';
import { SimulacionService } from '../core/services/simulacion.service';
import { UxService } from '../core/services/ux.service';

@Component({
  selector: 'app-practica-detalle',
  imports: [
    CommonModule, FormsModule, RouterLink, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatCheckboxModule, MatProgressBarModule, MatSnackBarModule,
    MatTooltipModule, MatDividerModule, MatDialogModule,
  ],
  templateUrl: './practica-detalle.html',
  styleUrl: './practica-detalle.scss',
})
export class PracticaDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly practicas = inject(PracticasService);
  private readonly academico = inject(AcademicoService);
  private readonly extras = inject(ExtrasService);
  private readonly simulacion = inject(SimulacionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly ux = inject(UxService);

  readonly loading = signal(true);
  readonly practica = signal<PracticaDetalle | null>(null);
  readonly seguimiento = signal<SeguimientoParticipacion[]>([]);
  readonly tab = signal<'resumen' | 'participantes' | 'codigos' | 'seguimiento'>('resumen');

  readonly tabs = [
    { id: 'resumen' as const, label: 'Resumen' },
    { id: 'participantes' as const, label: 'Participantes' },
    { id: 'codigos' as const, label: 'Códigos de acceso' },
    { id: 'seguimiento' as const, label: 'Seguimiento' },
  ];

  readonly estudiantes = signal<Estudiante[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly seleccionEst: Record<number, boolean> = {};
  readonly seleccionGrupo: Record<number, boolean> = {};

  readonly EstadoPractica = EstadoPractica;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/practicas']); return; }
    this.cargar(id);
    this.academico.listarEstudiantes().subscribe((r) => this.estudiantes.set(r.results));
    this.academico.listarGrupos().subscribe((r) => this.grupos.set(r.results));
  }

  cargar(id: number) {
    this.loading.set(true);
    this.practicas.obtener(id).subscribe({
      next: (p) => { this.practica.set(p); this.loading.set(false); },
      error: () => {
        this.snackBar.open('No se pudo cargar la práctica.', 'OK', { duration: 3500 });
        this.router.navigate(['/practicas']);
      },
    });
    this.simulacion.listarSeguimiento({ practica: id }).subscribe({
      next: (rows) => this.seguimiento.set(rows),
    });
  }

  seguimientoBadge(estado: string): string {
    switch (estado) {
      case 'EN_CURSO': return 'badge badge--en-curso';
      case 'FINALIZADA': return 'badge badge--finalizado';
      case 'INCOMPLETA': return 'badge badge--pendiente';
      case 'NO_INICIADA': return 'badge badge--sin-iniciar';
      default: return 'badge';
    }
  }

  reintentoAutorizado(autorizacionId: number): boolean {
    const auth = this.practica()?.autorizaciones.find((a) => a.id === autorizacionId);
    return auth?.reintento_autorizado ?? false;
  }

  puedeAutorizarReintento(estado: string): boolean {
    return estado === 'FINALIZADA' || estado === 'INCOMPLETA';
  }

  async autorizarReintento(autorizacionId: number): Promise<void> {
    const p = this.practica();
    if (!p) return;
    const ok = await this.ux.confirm({
      titulo: 'Autorizar reintento',
      mensaje: 'El estudiante podrá iniciar la práctica de nuevo aunque ya la haya finalizado.',
      variant: 'info',
      textoConfirmar: 'Autorizar',
      icono: 'replay',
    });
    if (!ok) return;
    this.practicas.autorizarReintento(p.id, autorizacionId).subscribe({
      next: () => {
        this.snackBar.open('Reintento autorizado.', 'OK', { duration: 2500 });
        this.cargar(p.id);
      },
      error: () => this.snackBar.open('No se pudo autorizar el reintento.', 'OK', { duration: 3500 }),
    });
  }

  copiar(codigo: string) {
    navigator.clipboard.writeText(codigo);
    this.snackBar.open(`Código copiado: ${codigo}`, 'OK', { duration: 2000 });
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

  autorizar() {
    const p = this.practica();
    if (!p) return;
    const estIds = Object.entries(this.seleccionEst).filter(([, v]) => v).map(([k]) => Number(k));
    const grupoIds = Object.entries(this.seleccionGrupo).filter(([, v]) => v).map(([k]) => Number(k));
    if (estIds.length === 0 && grupoIds.length === 0) {
      this.snackBar.open('Selecciona al menos un estudiante o grupo.', 'OK', { duration: 3000 });
      return;
    }
    this.pedirClaveGmail('Autorizar y enviar invitaciones por correo').subscribe((clave) => {
      if (clave === null) return;
      this.ejecutarAutorizar(p, estIds, grupoIds, clave || undefined);
    });
  }

  private pedirClaveGmail(titulo: string): Observable<string | null | undefined> {
    if (this.auth.usuario()?.correo_smtp_configurado) {
      return of(undefined);
    }
    return this.dialog.open(CorreoInvitacionesDialog, {
      ...mockupDialog('480px'),
      data: { modo: 'enviar', titulo, boton: 'Enviar correo' },
    }).afterClosed();
  }

  private ejecutarAutorizar(p: PracticaDetalle, estIds: number[], grupoIds: number[], clave?: string) {
    this.practicas.autorizarEstudiantes(p.id, estIds, grupoIds, clave).subscribe({
      next: (r) => {
        if (clave) this.auth.cargarPerfil().subscribe();
        const msg = r.correos_fallidos > 0
          ? `${r.creadas} autorizados. ${r.correos_enviados} correos enviados, ${r.correos_fallidos} fallaron. Verifica tu contraseña Gmail.`
          : r.creadas > 0
            ? `${r.creadas} estudiantes autorizados. ${r.correos_enviados} invitaciones enviadas por correo.`
            : 'No había estudiantes nuevos por autorizar.';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        for (const k of Object.keys(this.seleccionEst)) this.seleccionEst[Number(k)] = false;
        for (const k of Object.keys(this.seleccionGrupo)) this.seleccionGrupo[Number(k)] = false;
        this.cargar(p.id);
      },
      error: (err) => {
        const msg = err?.error?.correo_smtp_password?.[0]
          || err?.error?.detail
          || 'No se pudo autorizar.';
        this.snackBar.open(typeof msg === 'string' ? msg : 'No se pudo autorizar.', 'OK', { duration: 4500 });
      },
    });
  }

  reenviarInvitacion(autorizacionId: number) {
    const p = this.practica();
    if (!p) return;
    this.pedirClaveGmail('Reenviar invitación por correo').subscribe((clave) => {
      if (clave === null) return;
      this.practicas.reenviarInvitacion(p.id, autorizacionId, clave || undefined).subscribe({
        next: () => {
          if (clave) this.auth.cargarPerfil().subscribe();
          this.snackBar.open('Invitación reenviada por correo.', 'OK', { duration: 3000 });
          this.cargar(p.id);
        },
        error: (err) => {
          const msg = err?.error?.correo_smtp_password?.[0]
            || err?.error?.detail
            || 'No se pudo enviar el correo.';
          this.snackBar.open(typeof msg === 'string' ? msg : 'No se pudo enviar el correo.', 'OK', { duration: 4500 });
        },
      });
    });
  }

  iniciar() {
    const p = this.practica();
    if (!p) return;
    this.practicas.iniciar(p.id).subscribe({
      next: () => { this.snackBar.open('Práctica iniciada.', 'OK', { duration: 2500 }); this.cargar(p.id); },
    });
  }

  async finalizar(): Promise<void> {
    const p = this.practica();
    if (!p) return;
    const ok = await this.ux.confirm({
      titulo: 'Finalizar práctica',
      mensaje: 'Los estudiantes ya no podrán enviar nuevas participaciones. Los resultados quedarán consolidados.',
      variant: 'warn',
      textoConfirmar: 'Finalizar',
      icono: 'flag',
    });
    if (!ok) return;
    this.practicas.finalizar(p.id).subscribe({
      next: () => { this.snackBar.open('Práctica finalizada.', 'OK', { duration: 2500 }); this.cargar(p.id); },
    });
  }

  descargarPDF() {
    const p = this.practica();
    if (!p) return;
    this.extras.descargarReportePracticaPDF(p.id).subscribe((blob) => this._descargar(blob, `reporte-practica-${p.id}.pdf`));
  }
  descargarExcel() {
    const p = this.practica();
    if (!p) return;
    this.extras.descargarReportePracticaExcel(p.id).subscribe((blob) => this._descargar(blob, `reporte-practica-${p.id}.xlsx`));
  }
  private _descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
