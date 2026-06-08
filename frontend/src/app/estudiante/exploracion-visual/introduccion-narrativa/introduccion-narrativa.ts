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
import { DURACION_CROSSFADE_MS } from '../../../core/simulacion-narrativa/utils/introduccion-narrativa.util';

type FaseIntro = 'cargando' | 'advertencia' | 'secuencia' | 'transicion';

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

  private escenaTimer: ReturnType<typeof setTimeout> | null = null;
  private crossfadeTimer: ReturnType<typeof setTimeout> | null = null;
  private transicionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly escenaActual = computed(() => {
    const cfg = this.config();
    const idx = this.indiceEscena();
    return cfg?.escenas[idx] ?? null;
  });

  readonly fondoActualUrl = computed(() => {
    const escena = this.escenaActual();
    return escena ? this.assets.resolverRutaAsset(escena.imagen) : '';
  });

  readonly fondoSiguienteUrl = computed(() => {
    const cfg = this.config();
    const siguiente = cfg?.escenas[this.indiceEscena() + 1];
    return siguiente ? this.assets.resolverRutaAsset(siguiente.imagen) : '';
  });

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
    this.fase.set('secuencia');
    this.indiceEscena.set(0);
    this.programarEscena();
  }

  private programarEscena(): void {
    this.limpiarTimers();
    const cfg = this.config();
    if (!cfg) return;

    const duracion = cfg.duracionEscenaMs;
    const esUltima = this.indiceEscena() >= cfg.escenas.length - 1;

    this.escenaTimer = window.setTimeout(() => {
      if (esUltima) {
        this.iniciarTransicionFinal();
        return;
      }

      this.transicionando.set(true);
      this.crossfadeTimer = window.setTimeout(() => {
        this.indiceEscena.update((i) => i + 1);
        this.transicionando.set(false);
        this.programarEscena();
      }, DURACION_CROSSFADE_MS);
    }, duracion);
  }

  private iniciarTransicionFinal(): void {
    this.limpiarTimers();
    this.fase.set('transicion');

    const duracion = this.config()?.duracionTransicionFinalMs ?? 2000;
    this.transicionTimer = window.setTimeout(() => {
      this.completada.emit();
    }, duracion);
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
