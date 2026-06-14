import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ConfigIntroduccionNarrativa } from '../../../core/simulacion-narrativa/models/introduccion.model';
import { AssetService } from '../../../core/simulacion-narrativa/services/asset.service';
import { IntroduccionLoaderService } from '../../../core/simulacion-narrativa/services/introduccion-loader.service';
import {
  DURACION_CROSSFADE_MS,
  DURACION_FADE_ADVERTENCIA_MS,
  DURACION_FADE_SECUENCIA_FINAL_MS,
  DURACION_FADE_TEXTO_SALIDA_MS,
} from '../../../core/simulacion-narrativa/utils/introduccion-narrativa.util';

type FaseIntro = 'cargando' | 'advertencia' | 'secuencia' | 'transicion';
type CapaFondo = 0 | 1;

@Component({
  selector: 'app-introduccion-narrativa',
  imports: [MatProgressBarModule],
  templateUrl: './introduccion-narrativa.html',
  styleUrl: './introduccion-narrativa.scss',
})
export class IntroduccionNarrativaComponent implements OnInit {
  private readonly loader = inject(IntroduccionLoaderService);
  private readonly assets = inject(AssetService);
  private readonly destroyRef = inject(DestroyRef);

  readonly casoId = input.required<string>();
  readonly completada = output<void>();
  readonly sinIntroduccion = output<void>();

  readonly fase = signal<FaseIntro>('cargando');
  readonly config = signal<ConfigIntroduccionNarrativa | null>(null);
  readonly indiceEscena = signal(0);
  readonly transicionando = signal(false);
  readonly capaActiva = signal<CapaFondo>(0);
  readonly urlsCapas = signal<[string, string]>(['', '']);
  readonly textoMostrado = signal('');
  readonly textoTransicionando = signal(false);
  readonly saliendoAdvertencia = signal(false);
  readonly primeraEntrada = signal(false);
  readonly overlayFinal = signal(false);

  private escenaTimer: ReturnType<typeof setTimeout> | null = null;
  private crossfadeTimer: ReturnType<typeof setTimeout> | null = null;
  private transicionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly lineasTransicion = computed(
    () => this.config()?.transicionFinal.lineas ?? [],
  );

  ngOnInit(): void {
    this.loader.cargarConfig(this.casoId()).subscribe((cfg) => {
      if (!cfg?.escenas.length) {
        this.sinIntroduccion.emit();
        return;
      }
      this.config.set(cfg);
      this.fase.set('advertencia');
    });

    this.destroyRef.onDestroy(() => this.limpiarTimers());
  }

  aceptarAdvertencia(): void {
    if (this.fase() !== 'advertencia') return;

    const cfg = this.config();
    if (!cfg) return;

    void this.precargarImagenes(cfg).then(() => {
      const urlInicial = this.assets.resolverRutaAsset(cfg.escenas[0].imagen);

      this.urlsCapas.set([urlInicial, urlInicial]);
      this.capaActiva.set(0);
      this.textoMostrado.set(cfg.escenas[0].texto);
      this.indiceEscena.set(0);
      this.primeraEntrada.set(true);
      this.fase.set('secuencia');
      this.saliendoAdvertencia.set(true);

      window.setTimeout(() => {
        this.saliendoAdvertencia.set(false);
      }, DURACION_FADE_ADVERTENCIA_MS);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          this.primeraEntrada.set(false);
        });
      });

      this.programarEscena();
    });
  }

  private programarEscena(): void {
    this.limpiarTimers();
    const cfg = this.config();
    if (!cfg) return;

    const idx = this.indiceEscena();
    const esUltima = idx >= cfg.escenas.length - 1;
    const duracion = cfg.duracionEscenaMs;
    const solapamiento = esUltima
      ? 0
      : Math.min(DURACION_CROSSFADE_MS, Math.floor(duracion * 0.28));
    const tiempoVisible = esUltima ? duracion : duracion - solapamiento;

    this.escenaTimer = window.setTimeout(() => {
      if (esUltima) {
        this.iniciarTransicionFinal();
        return;
      }
      this.iniciarCrossfadeEscena();
    }, tiempoVisible);
  }

  private iniciarCrossfadeEscena(): void {
    const cfg = this.config();
    if (!cfg) return;

    const siguienteIdx = this.indiceEscena() + 1;
    const escenaSiguiente = cfg.escenas[siguienteIdx];
    if (!escenaSiguiente) return;

    const siguienteUrl = this.assets.resolverRutaAsset(escenaSiguiente.imagen);
    const capaEntrante: CapaFondo = this.capaActiva() === 0 ? 1 : 0;

    this.textoTransicionando.set(true);
    this.transicionando.set(true);

    this.crossfadeTimer = window.setTimeout(() => {
      this.urlsCapas.update(([capaA, capaB]) =>
        capaEntrante === 0 ? [siguienteUrl, capaB] : [capaA, siguienteUrl],
      );
      this.capaActiva.set(capaEntrante);

      this.crossfadeTimer = window.setTimeout(() => {
        this.textoMostrado.set(escenaSiguiente.texto);
        this.textoTransicionando.set(false);
        this.transicionando.set(false);
        this.indiceEscena.set(siguienteIdx);
        this.programarEscena();
      }, DURACION_CROSSFADE_MS);
    }, DURACION_FADE_TEXTO_SALIDA_MS);
  }

  private iniciarTransicionFinal(): void {
    this.limpiarTimers();
    this.textoTransicionando.set(true);

    this.transicionTimer = window.setTimeout(() => {
      this.overlayFinal.set(true);

      this.transicionTimer = window.setTimeout(() => {
        this.fase.set('transicion');
        const duracion = this.config()?.duracionTransicionFinalMs ?? 2000;
        this.transicionTimer = window.setTimeout(() => {
          this.completada.emit();
        }, duracion);
      }, DURACION_FADE_SECUENCIA_FINAL_MS);
    }, DURACION_FADE_TEXTO_SALIDA_MS);
  }

  private precargarImagenes(cfg: ConfigIntroduccionNarrativa): Promise<void> {
    return Promise.all(
      cfg.escenas.map(
        (escena) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = this.assets.resolverRutaAsset(escena.imagen);
          }),
      ),
    ).then(() => undefined);
  }

  private limpiarTimers(): void {
    if (this.escenaTimer !== null) {
      clearTimeout(this.escenaTimer);
      this.escenaTimer = null;
    }
    if (this.crossfadeTimer !== null) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }
    if (this.transicionTimer !== null) {
      clearTimeout(this.transicionTimer);
      this.transicionTimer = null;
    }
  }
}
