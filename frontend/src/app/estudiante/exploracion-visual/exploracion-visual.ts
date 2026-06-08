import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Evidencia } from '../../core/simulacion-narrativa/models/evidencia.model';
import { AmbienteAudioService } from '../../core/simulacion-narrativa/services/ambiente-audio.service';
import { InterfazSonidoService } from '../../core/simulacion-narrativa/services/interfaz-sonido.service';
import { NarrativaFacadeService } from '../../core/simulacion-narrativa/services/narrativa-facade.service';
import { DialogoNarrativoComponent } from './dialogo-narrativo/dialogo-narrativo';
import { DocumentoEvidenciaComponent } from './documento-evidencia/documento-evidencia';
import { EscenaVisualComponent } from './escena-visual/escena-visual';
import { EscenaVisualService } from './services/escena-visual.service';

@Component({
  selector: 'app-exploracion-visual',
  imports: [
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    EscenaVisualComponent,
    DialogoNarrativoComponent,
    DocumentoEvidenciaComponent,
  ],
  templateUrl: './exploracion-visual.html',
  styleUrl: './exploracion-visual.scss',
})
export class ExploracionVisualComponent implements OnInit {
  private readonly escenas = inject(EscenaVisualService);
  private readonly facade = inject(NarrativaFacadeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ambiente = inject(AmbienteAudioService);
  private readonly interfazSonido = inject(InterfazSonidoService);

  readonly casoId = input.required<string>();

  readonly cargandoEscenas = signal(true);
  readonly conversacionActivaId = signal<string | null>(null);
  readonly modoAcercamiento = signal(false);
  readonly evidenciaAbierta = signal<Evidencia | null>(null);

  readonly escenaActual = this.escenas.escenaActual;
  readonly tiempoNarrativo = this.facade.tiempoNarrativoFormateado;
  readonly tituloCaso = computed(() => this.facade.caso()?.manifest.titulo ?? '');

  ngOnInit(): void {
    this.escenas.cargarConfiguracion(this.casoId()).subscribe({
      next: () => this.cargandoEscenas.set(false),
      error: () => this.cargandoEscenas.set(false),
    });
  }

  abrirConversacion(evento: { conversacionId: string; modoAcercamiento?: boolean }): void {
    this.modoAcercamiento.set(!!evento.modoAcercamiento);
    this.conversacionActivaId.set(evento.conversacionId);
    this.interfazSonido.abrirConversacion();
    this.ambiente.entrarDialogo();
  }

  cerrarConversacion(): void {
    this.conversacionActivaId.set(null);
    this.modoAcercamiento.set(false);
    this.ambiente.salirDialogo();
  }

  abrirDocumento(evidenciaId: string): void {
    const evidencia = this.facade.caso()?.evidencias[evidenciaId];
    if (!evidencia) return;
    this.facade.descubrirEvidencia(evidenciaId);
    this.evidenciaAbierta.set(evidencia);
  }

  cerrarDocumento(): void {
    this.evidenciaAbierta.set(null);
  }

  mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Entendido', { duration: 2800, panelClass: 'snackbar-discreto' });
  }
}
