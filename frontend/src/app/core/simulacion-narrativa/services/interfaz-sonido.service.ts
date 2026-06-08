import { Injectable, inject } from '@angular/core';

import { AmbienteAudioService } from './ambiente-audio.service';

/** Sonidos de interfaz discretos — estilo clínico / novela visual moderna. */
@Injectable({ providedIn: 'root' })
export class InterfazSonidoService {
  private readonly ambiente = inject(AmbienteAudioService);

  abrirConversacion(): void {
    void this.reproducir((ctx, destino, ahora) => {
      const tono = ctx.createOscillator();
      tono.type = 'sine';
      tono.frequency.setValueAtTime(392, ahora);
      tono.frequency.exponentialRampToValueAtTime(330, ahora + 0.18);

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 680;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ahora);
      gain.gain.exponentialRampToValueAtTime(0.018, ahora + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.22);

      tono.connect(filtro);
      filtro.connect(gain);
      gain.connect(destino);
      tono.start(ahora);
      tono.stop(ahora + 0.24);
    });
  }

  avanzarDialogo(): void {
    void this.reproducir((ctx, destino, ahora) => {
      const tono = ctx.createOscillator();
      tono.type = 'triangle';
      tono.frequency.setValueAtTime(520, ahora);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ahora);
      gain.gain.exponentialRampToValueAtTime(0.009, ahora + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.06);

      tono.connect(gain);
      gain.connect(destino);
      tono.start(ahora);
      tono.stop(ahora + 0.07);
    });
  }

  cerrarConversacion(): void {
    void this.reproducir((ctx, destino, ahora) => {
      const tono = ctx.createOscillator();
      tono.type = 'sine';
      tono.frequency.setValueAtTime(440, ahora);
      tono.frequency.exponentialRampToValueAtTime(350, ahora + 0.28);

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.setValueAtTime(900, ahora);
      filtro.frequency.exponentialRampToValueAtTime(420, ahora + 0.28);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ahora);
      gain.gain.exponentialRampToValueAtTime(0.014, ahora + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.32);

      tono.connect(filtro);
      filtro.connect(gain);
      gain.connect(destino);
      tono.start(ahora);
      tono.stop(ahora + 0.34);
    });
  }

  completarEntrevista(): void {
    void this.reproducir((ctx, destino, ahora) => {
      const notas = [523.25, 659.25];
      notas.forEach((freq, i) => {
        const offset = i * 0.11;
        const tono = ctx.createOscillator();
        tono.type = 'sine';
        tono.frequency.setValueAtTime(freq, ahora + offset);

        const gain = ctx.createGain();
        const t = ahora + offset;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.016, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

        tono.connect(gain);
        gain.connect(destino);
        tono.start(t);
        tono.stop(t + 0.4);
      });
    });
  }

  private async reproducir(
    construir: (
      ctx: AudioContext,
      destino: GainNode,
      ahora: number,
    ) => void,
  ): Promise<void> {
    if (this.ambiente.silenciado()) return;

    let ctx = await this.ambiente.obtenerContextoAudio();
    if (!ctx) {
      ctx = new AudioContext();
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          return;
        }
      }
    }

    const destino = ctx.createGain();
    destino.gain.value = 0.85;
    destino.connect(ctx.destination);

    construir(ctx, destino, ctx.currentTime);
  }
}
