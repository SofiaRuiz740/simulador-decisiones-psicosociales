import { Component, input, output } from '@angular/core';

import { PosicionEscena, posicionCss } from '../models/escena-visual.model';

@Component({
  selector: 'app-hotspot-personaje',
  template: `
    <button
      type="button"
      class="hotspot-personaje"
      [class.interactuable]="interactuable()"
      [class.agotado]="agotado()"
      [class.activo]="activo()"
      [style]="estiloPosicion()"
      [attr.aria-label]="etiqueta()"
      (click)="onClick()">
      <span class="hotspot-personaje-silueta" aria-hidden="true"></span>
      <span class="hotspot-personaje-tooltip">{{ etiqueta() }}</span>
    </button>
  `,
  styleUrl: './hotspot-personaje.scss',
})
export class HotspotPersonajeComponent {
  readonly area = input.required<PosicionEscena>();
  readonly etiqueta = input.required<string>();
  readonly interactuable = input(true);
  readonly agotado = input(false);
  readonly activo = input(false);

  readonly activar = output<void>();
  readonly intentoBloqueado = output<void>();

  estiloPosicion(): Record<string, string> {
    return {
      ...posicionCss(this.area()),
      position: 'absolute',
    };
  }

  onClick(): void {
    if (this.interactuable() || this.agotado()) {
      this.activar.emit();
      return;
    }
    this.intentoBloqueado.emit();
  }
}
