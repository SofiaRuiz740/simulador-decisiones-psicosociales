import { Injectable, signal } from '@angular/core';

import {
  AUDIO_AMBIENTE_INTRO_REGISTRADO,
  AUDIO_AMBIENTE_REGISTRADO,
  BASE_ASSETS_SIMULACION,
} from '../models/asset.model';

const STORAGE_SILENCIADO = 'simulador.ambiente.silenciado';
const STORAGE_VOLUMEN = 'simulador.ambiente.volumen';

/** Volumen base recomendado: 12–15 % — discreto y legible. */
export const VOLUMEN_AMBIENTE_DEFECTO = 0.13;
export const VOLUMEN_AMBIENTE_MIN = 0.1;
export const VOLUMEN_AMBIENTE_MAX = 0.3;

const FACTOR_DUCK_DIALOGO = 0.45;
const DURACION_FADE_IN_MS = 2500;
const DURACION_DUCK_MS = 520;
const DURACION_CROSSFADE_PISTA_MS = 1750;
const DURACION_CROSSFADE_LOOP_MS = 2000;
const UMBRAL_LOOP_ANTICIPADO_S = 3;
const VARIACION_VOLUMEN_AMPLITUD = 0.022;
const PERIODO_MODULACION_MS = 82000;

export type FaseAmbienteAudio = 'intro' | 'simulacion';

type BackendAmbiente = 'archivo' | 'sintetico' | null;

interface PistaArchivo {
  elemento: HTMLAudioElement;
  gain: GainNode;
  origen: MediaElementAudioSourceNode;
}

function leerSilenciado(): boolean {
  try {
    return localStorage.getItem(STORAGE_SILENCIADO) === '1';
  } catch {
    return false;
  }
}

function leerVolumenBase(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUMEN);
    if (raw == null) return VOLUMEN_AMBIENTE_DEFECTO;
    const n = Number(raw);
    if (!Number.isFinite(n)) return VOLUMEN_AMBIENTE_DEFECTO;
    return Math.min(VOLUMEN_AMBIENTE_MAX, Math.max(VOLUMEN_AMBIENTE_MIN, n));
  } catch {
    return VOLUMEN_AMBIENTE_DEFECTO;
  }
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

@Injectable({ providedIn: 'root' })
export class AmbienteAudioService {
  private backend: BackendAmbiente = null;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private pistaA: PistaArchivo | null = null;
  private pistaB: PistaArchivo | null = null;
  private pistaActiva: 'A' | 'B' = 'A';
  private duracionPista = 0;
  private urlPistaActual = '';
  private crossfadeLoopEnCurso = false;
  private onTimeUpdate: (() => void) | null = null;

  private osciladores: OscillatorNode[] = [];
  private ruidoSource: AudioBufferSourceNode | null = null;

  private fadeFrame: number | null = null;
  private modulacionFrame: number | null = null;
  private modulacionInicio = 0;
  private moduladorVolumen = 1;
  private volumenSalidaActual = 0;

  private sesionActiva = false;
  private pendienteReproduccion = false;
  private faseActual: FaseAmbienteAudio = 'simulacion';
  private fadeInPendiente = false;

  readonly silenciado = signal(leerSilenciado());
  readonly volumenBase = signal(leerVolumenBase());
  readonly enDialogo = signal(false);
  readonly activo = signal(false);
  readonly requiereInteraccion = signal(false);

  volumenPorcentaje(): number {
    return Math.round(this.volumenBase() * 100);
  }

  /** Inicia la ambientación según la fase narrativa actual. */
  async iniciar(fase: FaseAmbienteAudio = 'simulacion'): Promise<void> {
    this.faseActual = fase;

    if (this.sesionActiva) {
      await this.intentarReproducir();
      return;
    }

    this.sesionActiva = true;
    const url = await this.resolverUrlPista(fase);

    const archivoDisponible = await this.probarArchivo(url);
    if (archivoDisponible) {
      try {
        await this.prepararArchivo(url);
      } catch {
        this.desconectarPistasArchivo();
        this.prepararSintetico();
      }
    } else {
      this.prepararSintetico();
    }

    await this.intentarReproducir();
  }

  /**
   * Transición suave al finalizar la introducción.
   * Si existe pista de intro distinta, aplica crossfade hacia hospital.
   */
  async transicionIntroAHospital(): Promise<void> {
    if (!this.sesionActiva || this.faseActual === 'simulacion') return;

    this.faseActual = 'simulacion';
    const urlHospital = `${BASE_ASSETS_SIMULACION}/${AUDIO_AMBIENTE_REGISTRADO}`;

    if (this.urlPistaActual === urlHospital) {
      return;
    }

    const hospitalDisponible = await this.probarArchivo(urlHospital);
    if (!hospitalDisponible) return;

    await this.crossfadeAPista(urlHospital, DURACION_CROSSFADE_PISTA_MS);
  }

  detener(): void {
    this.cancelarFade();
    this.detenerModulacion();
    this.desconectarPistasArchivo();
    this.sesionActiva = false;
    this.pendienteReproduccion = false;
    this.fadeInPendiente = false;
    this.requiereInteraccion.set(false);
    this.activo.set(false);
    this.enDialogo.set(false);
    this.faseActual = 'simulacion';
    this.urlPistaActual = '';
    this.crossfadeLoopEnCurso = false;

    this.osciladores.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* ya detenido */
      }
    });
    this.osciladores = [];

    if (this.ruidoSource) {
      try {
        this.ruidoSource.stop();
      } catch {
        /* ya detenido */
      }
      this.ruidoSource = null;
    }

    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
      this.masterGain = null;
    }

    this.backend = null;
  }

  /** Expone el contexto de audio para sonidos de interfaz (misma sesión). */
  async obtenerContextoAudio(): Promise<AudioContext | null> {
    if (!this.sesionActiva) return null;
    await this.asegurarContextoActivo();
    return this.audioCtx;
  }

  async desbloquearTrasInteraccion(): Promise<void> {
    if (!this.sesionActiva) return;
    await this.intentarReproducir();
  }

  toggleSilenciado(): void {
    const next = !this.silenciado();
    this.silenciado.set(next);
    try {
      localStorage.setItem(STORAGE_SILENCIADO, next ? '1' : '0');
    } catch {
      /* almacenamiento no disponible */
    }
    this.aplicarVolumenObjetivo(false, next ? 280 : DURACION_DUCK_MS);
  }

  establecerVolumenBase(valor: number): void {
    const clamped = Math.min(
      VOLUMEN_AMBIENTE_MAX,
      Math.max(VOLUMEN_AMBIENTE_MIN, valor),
    );
    this.volumenBase.set(clamped);
    try {
      localStorage.setItem(STORAGE_VOLUMEN, String(clamped));
    } catch {
      /* almacenamiento no disponible */
    }
    if (this.silenciado()) return;
    this.aplicarVolumenObjetivo(false, DURACION_DUCK_MS);
  }

  establecerVolumenPorcentaje(porcentaje: number): void {
    this.establecerVolumenBase(porcentaje / 100);
  }

  entrarDialogo(): void {
    if (!this.enDialogo()) {
      this.enDialogo.set(true);
      this.aplicarVolumenObjetivo(false, DURACION_DUCK_MS);
    }
  }

  salirDialogo(): void {
    if (this.enDialogo()) {
      this.enDialogo.set(false);
      this.aplicarVolumenObjetivo(false, DURACION_DUCK_MS);
    }
  }

  private volumenObjetivo(): number {
    if (this.silenciado()) return 0;
    const base = this.volumenBase();
    const duck = this.enDialogo() ? FACTOR_DUCK_DIALOGO : 1;
    return base * duck * this.moduladorVolumen;
  }

  private async resolverUrlPista(fase: FaseAmbienteAudio): Promise<string> {
    const urlHospital = `${BASE_ASSETS_SIMULACION}/${AUDIO_AMBIENTE_REGISTRADO}`;
    if (fase !== 'intro') return urlHospital;

    const urlIntro = `${BASE_ASSETS_SIMULACION}/${AUDIO_AMBIENTE_INTRO_REGISTRADO}`;
    const introDisponible = await this.probarArchivo(urlIntro);
    return introDisponible ? urlIntro : urlHospital;
  }

  private async probarArchivo(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async asegurarContextoActivo(): Promise<void> {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  private crearContexto(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  private async prepararArchivo(url: string): Promise<void> {
    this.backend = 'archivo';
    this.urlPistaActual = url;
    const ctx = this.crearContexto();
    if (!this.masterGain) return;

    this.pistaA = await this.crearPistaArchivo(ctx, url, this.masterGain);
    this.pistaB = await this.crearPistaArchivo(ctx, url, this.masterGain);
    this.pistaActiva = 'A';

    const activa = this.obtenerPistaActiva();
    if (activa) {
      this.duracionPista = activa.elemento.duration || 0;
      this.onTimeUpdate = () => this.vigilarLoopInterno();
      activa.elemento.addEventListener('timeupdate', this.onTimeUpdate);
    }
  }

  private async crearPistaArchivo(
    ctx: AudioContext,
    url: string,
    destino: GainNode,
  ): Promise<PistaArchivo> {
    const elemento = new Audio(url);
    elemento.preload = 'auto';
    elemento.loop = false;
    elemento.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      elemento.addEventListener('loadedmetadata', () => resolve(), { once: true });
      elemento.addEventListener('error', () => reject(), { once: true });
    }).catch(() => undefined);

    const origen = ctx.createMediaElementSource(elemento);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    origen.connect(gain);
    gain.connect(destino);

    return { elemento, gain, origen };
  }

  private obtenerPistaActiva(): PistaArchivo | null {
    return this.pistaActiva === 'A' ? this.pistaA : this.pistaB;
  }

  private obtenerPistaInactiva(): PistaArchivo | null {
    return this.pistaActiva === 'A' ? this.pistaB : this.pistaA;
  }

  private vigilarLoopInterno(): void {
    if (this.crossfadeLoopEnCurso || this.duracionPista < 12) return;

    const activa = this.obtenerPistaActiva();
    if (!activa) return;

    const restante = this.duracionPista - activa.elemento.currentTime;
    if (restante <= UMBRAL_LOOP_ANTICIPADO_S && restante > 0) {
      void this.crossfadeLoopInterno();
    }
  }

  private async crossfadeLoopInterno(): Promise<void> {
    const saliente = this.obtenerPistaActiva();
    const entrante = this.obtenerPistaInactiva();
    if (!saliente || !entrante || this.crossfadeLoopEnCurso) return;

    this.crossfadeLoopEnCurso = true;
    entrante.elemento.currentTime = 0;

    try {
      await entrante.elemento.play();
    } catch {
      this.crossfadeLoopEnCurso = false;
      return;
    }

    await this.crossfadeGanancias(
      saliente.gain,
      entrante.gain,
      DURACION_CROSSFADE_LOOP_MS,
    );

    saliente.elemento.pause();
    saliente.elemento.currentTime = 0;
    if (this.onTimeUpdate) {
      saliente.elemento.removeEventListener('timeupdate', this.onTimeUpdate);
      entrante.elemento.addEventListener('timeupdate', this.onTimeUpdate);
    }

    this.pistaActiva = this.pistaActiva === 'A' ? 'B' : 'A';
    this.crossfadeLoopEnCurso = false;
  }

  private async crossfadeAPista(url: string, duracionMs: number): Promise<void> {
    if (this.backend !== 'archivo' || !this.audioCtx || !this.masterGain) return;

    const saliente = this.obtenerPistaActiva();
    const reserva = this.obtenerPistaInactiva();
    if (!saliente || !reserva) return;

    if (reserva.elemento.src !== url) {
      reserva.elemento.src = url;
      await new Promise<void>((resolve) => {
        reserva.elemento.addEventListener('loadedmetadata', () => resolve(), { once: true });
      }).catch(() => undefined);
    }

    this.urlPistaActual = url;
    this.duracionPista = reserva.elemento.duration || 0;
    reserva.elemento.currentTime = 0;

    try {
      await reserva.elemento.play();
    } catch {
      return;
    }

    await this.crossfadeGanancias(saliente.gain, reserva.gain, duracionMs);

    saliente.elemento.pause();
    saliente.elemento.currentTime = 0;
    if (this.onTimeUpdate) {
      saliente.elemento.removeEventListener('timeupdate', this.onTimeUpdate);
      reserva.elemento.addEventListener('timeupdate', this.onTimeUpdate);
    }

    this.pistaActiva = this.pistaActiva === 'A' ? 'B' : 'A';
  }

  private crossfadeGanancias(
    saliente: GainNode,
    entrante: GainNode,
    duracionMs: number,
  ): Promise<void> {
    const objetivoEntrante = this.volumenObjetivo();
    const t0 = performance.now();

    return new Promise((resolve) => {
      const step = (now: number) => {
        const p = easeInOut(Math.min(1, (now - t0) / duracionMs));
        saliente.gain.value = objetivoEntrante * (1 - p);
        entrante.gain.value = objetivoEntrante * p;

        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  private prepararSintetico(): void {
    this.backend = 'sintetico';
    const ctx = this.crearContexto();
    if (!this.masterGain) return;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      channel[i] = last * 3.2;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 380;
    noiseFilter.Q.value = 0.6;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.22;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    if (this.masterGain) {
      noiseGain.connect(this.masterGain);
    }
    noise.start();
    this.ruidoSource = noise;

    [110, 164.81, 220, 329.63].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0.55 - index * 0.1;

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      }
      osc.start();
      this.osciladores.push(osc);
    });
  }

  private async intentarReproducir(): Promise<void> {
    if (!this.sesionActiva) return;

    try {
      if (this.backend === 'archivo') {
        const activa = this.obtenerPistaActiva();
        if (!activa) return;
        await this.asegurarContextoActivo();
        activa.elemento.currentTime = 0;
        await activa.elemento.play();
        activa.gain.gain.value = 0;
      } else if (this.backend === 'sintetico') {
        await this.asegurarContextoActivo();
      } else {
        return;
      }

      this.pendienteReproduccion = false;
      this.requiereInteraccion.set(false);
      this.activo.set(true);
      this.fadeInPendiente = true;
      this.aplicarVolumenObjetivo(false, DURACION_FADE_IN_MS);
      this.iniciarModulacionSutil();
    } catch {
      this.pendienteReproduccion = true;
      this.requiereInteraccion.set(true);
    }
  }

  private aplicarVolumenObjetivo(inmediato: boolean, duracionMs: number): void {
    const objetivo = this.volumenObjetivo();
    if (inmediato) {
      this.establecerVolumenInmediato(objetivo);
      return;
    }
    this.transicionarVolumen(objetivo, duracionMs);
  }

  private establecerVolumenInmediato(valor: number): void {
    this.cancelarFade();
    this.volumenSalidaActual = valor;

    if (this.backend === 'archivo') {
      const activa = this.obtenerPistaActiva();
      if (activa) activa.gain.gain.value = valor;
    } else if (this.backend === 'sintetico' && this.masterGain) {
      this.masterGain.gain.value = valor;
    }
  }

  private transicionarVolumen(objetivo: number, duracionMs: number): void {
    this.cancelarFade();

    const inicio = this.volumenSalidaActual;
    if (Math.abs(inicio - objetivo) < 0.001) {
      this.establecerVolumenInmediato(objetivo);
      this.fadeInPendiente = false;
      return;
    }

    const t0 = performance.now();
    const step = (now: number) => {
      const progreso = easeInOut(Math.min(1, (now - t0) / duracionMs));
      const actual = inicio + (objetivo - inicio) * progreso;
      this.volumenSalidaActual = actual;

      if (this.backend === 'archivo') {
        const activa = this.obtenerPistaActiva();
        if (activa) activa.gain.gain.value = actual;
      } else if (this.backend === 'sintetico' && this.masterGain) {
        this.masterGain.gain.value = actual;
      }

      if (progreso < 1) {
        this.fadeFrame = requestAnimationFrame(step);
      } else {
        this.fadeFrame = null;
        this.fadeInPendiente = false;
      }
    };

    this.fadeFrame = requestAnimationFrame(step);
  }

  private iniciarModulacionSutil(): void {
    this.detenerModulacion();
    this.modulacionInicio = performance.now();

    const tick = (now: number) => {
      if (!this.sesionActiva) return;

      const fase =
        ((now - this.modulacionInicio) / PERIODO_MODULACION_MS) * Math.PI * 2;
      this.moduladorVolumen = 1 + VARIACION_VOLUMEN_AMPLITUD * Math.sin(fase);

      if (!this.fadeInPendiente && !this.silenciado()) {
        const objetivo = this.volumenObjetivo();
        if (Math.abs(this.volumenSalidaActual - objetivo) > 0.0005) {
          this.establecerVolumenInmediato(objetivo);
        }
      }

      this.modulacionFrame = requestAnimationFrame(tick);
    };

    this.modulacionFrame = requestAnimationFrame(tick);
  }

  private detenerModulacion(): void {
    if (this.modulacionFrame != null) {
      cancelAnimationFrame(this.modulacionFrame);
      this.modulacionFrame = null;
    }
    this.moduladorVolumen = 1;
  }

  private cancelarFade(): void {
    if (this.fadeFrame != null) {
      cancelAnimationFrame(this.fadeFrame);
      this.fadeFrame = null;
    }
  }

  private desconectarPistasArchivo(): void {
    [this.pistaA, this.pistaB].forEach((pista) => {
      if (!pista) return;
      if (this.onTimeUpdate) {
        pista.elemento.removeEventListener('timeupdate', this.onTimeUpdate);
      }
      pista.elemento.pause();
      pista.elemento.src = '';
      try {
        pista.origen.disconnect();
        pista.gain.disconnect();
      } catch {
        /* ya desconectado */
      }
    });
    this.pistaA = null;
    this.pistaB = null;
    this.onTimeUpdate = null;
  }
}
