import { DestroyRef, Injectable, inject, signal } from '@angular/core';

type DocumentoFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type ElementoFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

@Injectable({ providedIn: 'root' })
export class FullscreenService {
  private readonly destroyRef = inject(DestroyRef);

  readonly activo = signal(false);

  constructor() {
    const onChange = (): void => this.sincronizarEstado();

    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    this.sincronizarEstado();

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    });
  }

  async entrar(element: HTMLElement): Promise<void> {
    if (this.esElementoFullscreen(element)) {
      this.sincronizarEstado();
      return;
    }

    const actual = this.obtenerElementoFullscreen();
    if (actual && actual !== element) {
      await this.salir();
    }

    try {
      await this.solicitarFullscreen(element);
    } catch {
      /* El usuario o el navegador pueden rechazar fullscreen */
    } finally {
      this.sincronizarEstado();
    }
  }

  async salir(): Promise<void> {
    if (!this.obtenerElementoFullscreen()) {
      this.activo.set(false);
      return;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        const doc = document as DocumentoFullscreen;
        if (doc.webkitExitFullscreen) {
          await Promise.resolve(doc.webkitExitFullscreen());
        }
      }
    } catch {
      /* noop */
    } finally {
      this.sincronizarEstado();
    }
  }

  async alternar(element: HTMLElement): Promise<void> {
    if (this.esElementoFullscreen(element)) {
      await this.salir();
      return;
    }
    await this.entrar(element);
  }

  private sincronizarEstado(): void {
    const doc = document as DocumentoFullscreen;
    this.activo.set(!!(document.fullscreenElement ?? doc.webkitFullscreenElement));
  }

  private esElementoFullscreen(element: HTMLElement): boolean {
    const actual = document.fullscreenElement ?? (document as DocumentoFullscreen).webkitFullscreenElement;
    return actual === element;
  }

  private obtenerElementoFullscreen(): Element | null {
    return document.fullscreenElement ?? (document as DocumentoFullscreen).webkitFullscreenElement ?? null;
  }

  private async solicitarFullscreen(element: HTMLElement): Promise<void> {
    const target = element as ElementoFullscreen;

    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return;
    }

    if (target.webkitRequestFullscreen) {
      await Promise.resolve(target.webkitRequestFullscreen());
    }
  }
}
