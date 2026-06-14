import { Component, computed, inject, input, output } from '@angular/core';

import { AssetService } from '../../../core/simulacion-narrativa/services/asset.service';
import { HotspotEscena, posicionCss } from '../models/escena-visual.model';

@Component({
  selector: 'app-hotspot-lupa',
  template: `
    <button
      type="button"
      class="hotspot-interactivo"
      [class.es-regreso]="hotspot().esRegreso"
      [class.es-evidencia]="hotspot().tipo === 'evidencia'"
      [class.es-conversacion]="hotspot().tipo === 'conversacion'"
      [class.es-dock]="modoDock()"
      [class.es-bloqueado]="!interactuable()"
      [style]="estiloPosicion()"
      [attr.aria-label]="hotspot().etiqueta"
      (click)="onClick()">
      <span
        class="hotspot-icono"
        [style.mask-image]="'url(' + iconoUrl() + ')'"
        [style.-webkit-mask-image]="'url(' + iconoUrl() + ')'"
        aria-hidden="true"></span>
      <span class="hotspot-tooltip">{{ hotspot().etiqueta }}</span>
    </button>
  `,
  styleUrl: './hotspot-lupa.scss',
})
export class HotspotLupaComponent {
  private readonly assets = inject(AssetService);

  readonly hotspot = input.required<HotspotEscena>();
  /** Acción fija en HUD: misma apariencia, etiqueta siempre visible. */
  readonly modoDock = input(false);
  readonly interactuable = input(true);

  readonly activar = output<void>();

  readonly iconoUrl = computed(() => this.assets.obtenerIconoHotspot(this.hotspot().tipo));

  estiloPosicion(): Record<string, string> {
    if (this.modoDock()) {
      return { position: 'relative' };
    }
    return {
      ...posicionCss(this.hotspot().posicion),
      position: 'absolute',
    };
  }

  onClick(): void {
    this.activar.emit();
  }
}
