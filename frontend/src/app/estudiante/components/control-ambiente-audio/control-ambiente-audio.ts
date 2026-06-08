import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  AmbienteAudioService,
  VOLUMEN_AMBIENTE_MAX,
  VOLUMEN_AMBIENTE_MIN,
} from '../../../core/simulacion-narrativa/services/ambiente-audio.service';

@Component({
  selector: 'app-control-ambiente-audio',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './control-ambiente-audio.html',
  styleUrl: './control-ambiente-audio.scss',
})
export class ControlAmbienteAudioComponent {
  readonly ambiente = inject(AmbienteAudioService);

  readonly volumenMinPct = Math.round(VOLUMEN_AMBIENTE_MIN * 100);
  readonly volumenMaxPct = Math.round(VOLUMEN_AMBIENTE_MAX * 100);

  iconoVolumen(): string {
    if (this.ambiente.silenciado()) return 'volume_off';
    if (this.ambiente.volumenPorcentaje() <= 12) return 'volume_mute';
    if (this.ambiente.volumenPorcentaje() <= 22) return 'volume_down';
    return 'volume_up';
  }

  alternarSilencio(event: Event): void {
    event.stopPropagation();
    this.ambiente.toggleSilenciado();
  }

  onVolumenInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ambiente.establecerVolumenPorcentaje(Number(input.value));
  }

  onMenuAbierto(): void {
    if (this.ambiente.requiereInteraccion()) {
      void this.ambiente.desbloquearTrasInteraccion();
    }
  }
}
