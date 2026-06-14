import { Component, computed, inject, input, output } from '@angular/core';

import { AssetService } from '../../../core/simulacion-narrativa/services/asset.service';
import { NarrativaFacadeService } from '../../../core/simulacion-narrativa/services/narrativa-facade.service';
import { HotspotLupaComponent } from '../hotspot-lupa/hotspot-lupa';
import { HotspotPersonajeComponent } from '../hotspot-personaje/hotspot-personaje';
import { EscenaVisual, HotspotEscena } from '../models/escena-visual.model';
import {
  EscenaVisualService,
  resolverHotspotsPersonajeEnEscena,
} from '../services/escena-visual.service';
import { variablesCssEscena } from '../utils/sprite-layout.util';
import { etiquetaInteraccionPersonaje } from '../utils/presentacion-personaje.util';
import { escenaEsAccesible, hotspotEsAccesible } from '../utils/escena-acceso.util';
import {
  HOTSPOTS_TRASLADO_COMISARIA,
  registrarDiagnosticoComisariaEnConsola,
} from '../utils/comisaria-acceso.util';

@Component({
  selector: 'app-escena-visual',
  imports: [HotspotLupaComponent, HotspotPersonajeComponent],
  templateUrl: './escena-visual.html',
  styleUrl: './escena-visual.scss',
})
export class EscenaVisualComponent {
  private readonly escenas = inject(EscenaVisualService);
  private readonly facade = inject(NarrativaFacadeService);
  private readonly assets = inject(AssetService);

  readonly escena = input.required<EscenaVisual>();
  readonly conversacionActivaId = input<string | null>(null);

  readonly abrirConversacion = output<{ conversacionId: string; modoAcercamiento?: boolean }>();
  readonly abrirDocumento = output<string>();
  readonly mensaje = output<string>();

  readonly transicionando = this.escenas.transicionActiva;

  readonly fondoUrl = computed(() => this.assets.obtenerEscenario(this.escena().id));

  readonly estiloEscena = computed(() => variablesCssEscena(this.escena().id));

  readonly hotspotsPersonaje = computed(() => {
    const estado = this.facade.estado();
    const escena = this.escena();
    if (!estado) return [];

    return resolverHotspotsPersonajeEnEscena(escena.sprites, {
      escenarioNarrativoActual: estado.escenarioActualId,
      conversacionesDisponibles: this.facade.conversacionesDisponibles().map((c) => c.id),
      conversacionesEnProgreso: Object.keys(estado.nodosConversacionActivos),
      conversacionesCompletadas: estado.conversacionesCompletadas,
      conversacionesAgotamientoReintento: escena.sprites
        .map((sprite) => sprite.conversacionId)
        .filter((id) => this.facade.conversacionPermiteReintentoAgotamiento(id)),
    });
  });

  readonly hotspotsVisibles = computed(() => {
    const escena = this.escena();
    return escena.hotspots.filter((hotspot) => {
      if (
        HOTSPOTS_TRASLADO_COMISARIA.includes(hotspot.id as (typeof HOTSPOTS_TRASLADO_COMISARIA)[number])
      ) {
        return false;
      }
      return this.hotspotEsVisible(hotspot);
    });
  });

  etiquetaHotspotPersonaje(hotspot: {
    personajeId: string;
    etiquetaInteraccion?: string;
    etiqueta?: string;
    rolVisual?: string;
  }): string {
    return etiquetaInteraccionPersonaje(
      hotspot.personajeId,
      hotspot.rolVisual ?? this.escenas.rolVisualDePersonaje(hotspot.personajeId),
      this.facade.caso()?.personajes,
      hotspot.etiquetaInteraccion ?? hotspot.etiqueta,
    );
  }

  onPersonajeIntegrado(
    conversacionId: string,
    interactuable: boolean,
    modoAcercamiento = true,
  ): void {
    if (!interactuable) {
      this.mensaje.emit(
        'Aún no puedes entrevistar a esta persona. Reúne más información clínica primero.',
      );
      return;
    }
    this.iniciarConversacion(conversacionId, modoAcercamiento);
  }

  onHotspot(hotspot: HotspotEscena): void {
    switch (hotspot.tipo) {
      case 'navegacion':
        if (hotspot.destinoEscenaId) {
          const destino = this.escenas.obtenerEscena(hotspot.destinoEscenaId);
          const estado = this.facade.estado();
          const caso = this.facade.caso();
          if (destino && !escenaEsAccesible(destino, estado, caso)) {
            this.mensaje.emit(
              'Esta ubicación aún no está disponible. Completa la evaluación hospitalaria primero.',
            );
            return;
          }
          if (!this.escenas.irAEscena(hotspot.destinoEscenaId, estado, caso)) {
            this.mensaje.emit('No puedes acceder a esa ubicación en este momento.');
            return;
          }
          if (destino?.escenarioNarrativoId) {
            this.facade.establecerEscenarioNarrativo(destino.escenarioNarrativoId);
          }
        }
        break;

      case 'evidencia':
        if (!hotspot.evidenciaId) return;
        if (
          !this.facade
            .evidenciasDescubribles()
            .some((evidencia) => evidencia.id === hotspot.evidenciaId)
        ) {
          this.mensaje.emit('Este material ya fue revisado o aún no está accesible.');
          return;
        }
        this.abrirDocumento.emit(hotspot.evidenciaId);
        break;

      case 'conversacion':
        if (!hotspot.conversacionId) return;
        this.iniciarConversacion(hotspot.conversacionId, hotspot.modoAcercamiento);
        break;

      case 'transicion_narrativa':
        if (!hotspot.transicionNarrativaId) return;
        const transicion = this.facade
          .transicionesDisponibles()
          .find((item) => item.id === hotspot.transicionNarrativaId);
        if (!transicion) {
          this.mensaje.emit('Esta área aún no está disponible.');
          return;
        }
        this.facade.transicionarEscenario(transicion.id);
        if (hotspot.destinoEscenaId) {
          this.escenas.irAEscena(hotspot.destinoEscenaId);
        }
        break;
    }
  }

  onHotspotPersonaje(
    conversacionId: string,
    interactuable: boolean,
    modoAcercamiento = true,
  ): void {
    this.onPersonajeIntegrado(conversacionId, interactuable, modoAcercamiento);
  }

  hotspotAgotado(conversacionId: string): boolean {
    return this.facade.estaConversacionBloqueadaPorFatiga(conversacionId);
  }

  private iniciarConversacion(conversacionId: string, modoAcercamiento = false): void {
    const estado = this.facade.estado();
    const enCurso = !!estado?.nodosConversacionActivos[conversacionId];
    const completada = estado?.conversacionesCompletadas.includes(conversacionId);

    if (enCurso && !completada) {
      this.abrirConversacion.emit({ conversacionId, modoAcercamiento });
      return;
    }

    if (this.facade.conversacionPermiteReintentoAgotamiento(conversacionId)) {
      this.facade.activarModoAgotamientoConversacion(conversacionId);
      this.abrirConversacion.emit({ conversacionId, modoAcercamiento });
      return;
    }

    const iniciada = this.facade.iniciarConversacion(conversacionId);
    const activaAhora = !!this.facade.estado()?.nodosConversacionActivos[conversacionId];

    if (!iniciada && !activaAhora) {
      this.mensaje.emit('No puedes iniciar esta conversación en este momento.');
      return;
    }

    this.abrirConversacion.emit({ conversacionId, modoAcercamiento });
  }

  private hotspotEsVisible(hotspot: HotspotEscena): boolean {
    const estado = this.facade.estado();
    const caso = this.facade.caso();

    if (HOTSPOTS_TRASLADO_COMISARIA.includes(hotspot.id as (typeof HOTSPOTS_TRASLADO_COMISARIA)[number])) {
      registrarDiagnosticoComisariaEnConsola(this.escena().id, hotspot.id, estado, caso);
    }

    if (!hotspotEsAccesible(hotspot, estado, caso)) {
      return false;
    }

    if (hotspot.tipo === 'transicion_narrativa') {
      return this.facade
        .transicionesDisponibles()
        .some((transicion) => transicion.id === hotspot.transicionNarrativaId);
    }

    if (hotspot.tipo === 'evidencia') {
      return this.facade
        .evidenciasDescubribles()
        .some((evidencia) => evidencia.id === hotspot.evidenciaId);
    }

    if (hotspot.tipo === 'conversacion') {
      if (!hotspot.conversacionId) return false;
      const id = hotspot.conversacionId;
      const disponibles = this.facade.conversacionesDisponibles().map((c) => c.id);
      const enCurso = !!this.facade.estado()?.nodosConversacionActivos[id];
      const completada = this.facade.estado()?.conversacionesCompletadas.includes(id);
      return disponibles.includes(id) || enCurso || !!completada;
    }

    return true;
  }
}
