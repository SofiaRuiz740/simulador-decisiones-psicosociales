import { DatePipe } from '@angular/common';
import { Component, ViewChild, computed, inject, input, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UxService } from '../../core/services/ux.service';
import { NotaEstudianteLibreta } from '../../core/simulacion-narrativa/models/libreta.model';
import { MetricaPersonaje } from '../../core/simulacion-narrativa/models/metricas-personaje.model';
import { NarrativaFacadeService } from '../../core/simulacion-narrativa/services/narrativa-facade.service';
import {
  LibretaNotaDialog,
  LibretaNotaDialogData,
} from './libreta-nota-dialog';
import {
  ETIQUETAS_ESTADO_CONTRADICCION,
  ETIQUETAS_METRICA,
  ETIQUETAS_ROL,
  ETIQUETAS_TIPO_LINEA,
  categorizarMetrica,
  claseCategoriaMetrica,
} from './libreta-presentacion.util';

@Component({
  selector: 'app-libreta-psicologo',
  imports: [
    DatePipe,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './libreta-psicologo.html',
  styleUrl: './libreta-psicologo.scss',
})
export class LibretaPsicologoComponent {
  private readonly facade = inject(NarrativaFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ux = inject(UxService);

  @ViewChild('panel') panel?: MatSidenav;

  readonly mostrarFab = input(true);

  readonly abierta = signal(false);
  readonly libreta = this.facade.libreta;
  readonly caso = this.facade.caso;
  readonly contradiccionesPosibles = this.facade.contradiccionesPosibles;

  readonly pendientesAnalisis = computed(() => this.contradiccionesPosibles().length);

  readonly metricasVisibles = computed(() => {
    const keys = Object.keys(ETIQUETAS_METRICA) as MetricaPersonaje[];
    return keys;
  });

  togglePanel(): void {
    if (!this.panel) return;

    if (this.panel.opened) {
      this.cerrarPanel();
      return;
    }

    void this.panel.open().then(() => {
      if (this.panel?.opened) {
        this.abierta.set(true);
      }
    });
  }

  cerrarPanel(): void {
    this.panel?.close();
    this.abierta.set(false);
  }

  rolPersonaje(personajeId: string): string {
    const rol = this.caso()?.personajes[personajeId]?.rol;
    return rol ? ETIQUETAS_ROL[rol] : 'Sin rol';
  }

  descripcionEvidencia(evidenciaId: string): string {
    return this.caso()?.evidencias[evidenciaId]?.descripcion ?? 'Sin descripción disponible.';
  }

  fechaNarrativaEvidencia(evidenciaId: string): string | undefined {
    const entrada = this.libreta()?.lineaTemporal.find(
      (e) => e.tipo === 'evidencia' && e.entidadId === evidenciaId,
    );
    return entrada?.tiempoNarrativo;
  }

  fuentesContradiccion(instanciaId: string, afirmacionIds: string[]): string[] {
    const instancia = this.facade
      .estado()
      ?.instanciasContradiccion.find((c) => c.id === instanciaId);

    if (instancia?.afirmacionesEnConflicto.length) {
      return instancia.afirmacionesEnConflicto.map(
        (a) => a.afirmacion.descripcion ?? `${a.origen}: "${a.afirmacion.valor}"`,
      );
    }

    return afirmacionIds.map((id) => `Afirmación ${id}`);
  }

  fuentesPosible(instanciaId: string): string[] {
    const instancia = this.contradiccionesPosibles().find((c) => c.id === instanciaId);
    if (!instancia) return [];
    return instancia.afirmacionesEnConflicto.map(
      (a) => a.afirmacion.descripcion ?? `${a.origen}: "${a.afirmacion.valor}"`,
    );
  }

  etiquetaEstado(estado: keyof typeof ETIQUETAS_ESTADO_CONTRADICCION): string {
    return ETIQUETAS_ESTADO_CONTRADICCION[estado];
  }

  etiquetaMetrica(metrica: MetricaPersonaje): string {
    return ETIQUETAS_METRICA[metrica];
  }

  categoriaMetrica(valor: number): string {
    return categorizarMetrica(valor);
  }

  claseMetrica(valor: number): string {
    return claseCategoriaMetrica(categorizarMetrica(valor));
  }

  etiquetaTipoLinea(tipo: keyof typeof ETIQUETAS_TIPO_LINEA): string {
    return ETIQUETAS_TIPO_LINEA[tipo];
  }

  etiquetaSoporte(tipo: string, entidadId: string): string {
    const caso = this.caso();
    if (!caso) return entidadId;

    switch (tipo) {
      case 'evidencia':
        return caso.evidencias[entidadId]?.titulo ?? entidadId;
      case 'contradiccion': {
        const instancia = this.facade
          .estado()
          ?.instanciasContradiccion.find(
            (c) => c.id === entidadId || c.plantillaId === entidadId,
          );
        return instancia?.titulo ?? entidadId;
      }
      case 'testimonio': {
        const afirmacion = this.facade
          .estado()
          ?.afirmacionesActivas.find((a) => a.afirmacion.id === entidadId);
        return afirmacion?.afirmacion.descripcion ?? `Testimonio: ${entidadId}`;
      }
      default:
        return entidadId;
    }
  }

  analizarContradiccion(referenciaId: string): void {
    const error = this.facade.analizarContradiccion(referenciaId);
    if (error) {
      this.snackBar.open(error, 'Entendido', { duration: 4000 });
      return;
    }
    this.snackBar.open('Contradicción registrada en la libreta.', 'OK', { duration: 2500 });
  }

  crearNota(): void {
    this.abrirDialogoNota({
      titulo: 'Nueva nota clínica',
      confirmar: 'Guardar nota',
    });
  }

  editarNota(nota: NotaEstudianteLibreta): void {
    this.abrirDialogoNota(
      {
        titulo: 'Editar nota',
        contenido: nota.contenido,
        confirmar: 'Actualizar',
      },
      nota,
    );
  }

  async eliminarNota(notaId: string): Promise<void> {
    const ok = await this.ux.confirm({
      titulo: 'Eliminar nota',
      mensaje: '¿Quieres eliminar esta nota de la libreta? No se puede deshacer.',
      variant: 'danger',
      textoConfirmar: 'Eliminar',
      icono: 'delete_outline',
    });
    if (!ok) return;
    this.facade.eliminarNotaLibreta(notaId);
    this.snackBar.open('Nota eliminada.', 'OK', { duration: 2000 });
  }

  private abrirDialogoNota(data: LibretaNotaDialogData, notaExistente?: NotaEstudianteLibreta): void {
    const ref = this.dialog.open(LibretaNotaDialog, {
      width: '420px',
      data,
      autoFocus: true,
    });

    ref.afterClosed().subscribe((contenido) => {
      if (!contenido) return;

      if (notaExistente) {
        this.facade.eliminarNotaLibreta(notaExistente.id);
        this.facade.agregarNotaLibreta(contenido, notaExistente.vinculos);
        this.snackBar.open('Nota actualizada.', 'OK', { duration: 2000 });
        return;
      }

      this.facade.agregarNotaLibreta(contenido);
      this.snackBar.open('Nota agregada a la libreta.', 'OK', { duration: 2000 });
    });
  }
}
