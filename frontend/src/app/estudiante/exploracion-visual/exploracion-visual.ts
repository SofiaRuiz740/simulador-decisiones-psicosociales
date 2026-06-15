import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
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
import { escenaEsAccesible } from './utils/escena-acceso.util';
import {
  crearHotspotTrasladoComisaria,
  diagnosticarTrasladoComisaria,
  escenaMuestraTrasladoEnDock,
  ESCENARIO_NARRATIVO_COMISARIA,
  DESTINO_ESCENA_COMISARIA,
} from './utils/comisaria-acceso.util';

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

  readonly hotspotTrasladoComisaria = computed(() => {
    if (this.conversacionActivaId() || this.evidenciaAbierta()) return null;

    const escena = this.escenaActual();
    if (!escena || !escenaMuestraTrasladoEnDock(escena.id)) return null;

    const diagnostico = diagnosticarTrasladoComisaria(this.facade.estado(), this.facade.caso());
    if (!diagnostico?.hotspotVisible) return null;

    return crearHotspotTrasladoComisaria();
  });

  constructor() {
    effect(() => {
      const escena = this.escenaActual();
      if (!escena) return;
      if (escena.id === 'exterior-comisaria' || escena.id === 'interior-comisaria') {
        void this.ambiente.transicionHospitalAComisaria();
        return;
      }
      if (escena.escenarioNarrativoId === 'consulta-inicial') {
        void this.ambiente.transicionComisariaAHospital();
      }
    });

    effect(() => {
      const estado = this.facade.estado();
      const escena = this.escenaActual();
      if (!estado || escena?.escenarioNarrativoId !== 'consulta-inicial') return;

      if (typeof window !== 'undefined') {
        (window as Window & { __fase21aDiagnosticoComisaria?: () => ReturnType<typeof diagnosticarTrasladoComisaria> })
          .__fase21aDiagnosticoComisaria = () =>
          diagnosticarTrasladoComisaria(this.facade.estado(), this.facade.caso());
      }
    });
  }

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

  trasladarseAComisaria(): void {
    const destino = this.escenas.obtenerEscena(DESTINO_ESCENA_COMISARIA);
    const estado = this.facade.estado();
    const caso = this.facade.caso();

    if (!destino || !escenaEsAccesible(destino, estado, caso)) {
      this.mostrarMensaje(
        'La comisaría aún no está disponible. Completa las entrevistas hospitalarias obligatorias.',
      );
      return;
    }

    if (!this.escenas.irAEscena(DESTINO_ESCENA_COMISARIA, estado, caso)) {
      this.mostrarMensaje('No puedes acceder a la comisaría en este momento.');
      return;
    }

    this.facade.establecerEscenarioNarrativo(ESCENARIO_NARRATIVO_COMISARIA);
  }
}
