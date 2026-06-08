import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ControlAmbienteAudioComponent } from '../control-ambiente-audio/control-ambiente-audio';

@Component({
  selector: 'app-barra-simulacion',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, ControlAmbienteAudioComponent],
  templateUrl: './barra-simulacion.html',
  styleUrl: './barra-simulacion.scss',
})
export class BarraSimulacionComponent {
  readonly nombrePractica = input.required<string>();
  readonly nombreCaso = input.required<string>();
  readonly estadoLabel = input('En progreso');
  readonly pantallaCompletaActiva = input(false);

  readonly libreta = output<void>();
  readonly mapa = output<void>();
  readonly pantallaCompleta = output<void>();
  readonly salir = output<void>();
}
