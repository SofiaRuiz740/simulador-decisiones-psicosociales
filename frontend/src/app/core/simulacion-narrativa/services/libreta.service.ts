import { Injectable, inject } from '@angular/core';

import { LibretaPsicologo, NotaEstudianteLibreta } from '../models';
import { sincronizarLibretaDesdeEstado } from '../utils/libreta-sync.util';
import { NarrativaStateService } from './narrativa-state.service';

@Injectable({ providedIn: 'root' })
export class LibretaService {
  private readonly state = inject(NarrativaStateService);

  obtenerLibreta(): LibretaPsicologo | null {
    return this.state.estado()?.libreta ?? null;
  }

  sincronizar(): LibretaPsicologo | null {
    const estado = this.state.estado();
    const caso = this.state.caso();
    if (!estado) return null;

    this.state.actualizarEstado((copia) => {
      sincronizarLibretaDesdeEstado(copia, caso);
    });

    return this.state.estado()?.libreta ?? null;
  }

  agregarNota(
    contenido: string,
    vinculos?: NotaEstudianteLibreta['vinculos'],
  ): NotaEstudianteLibreta | null {
    const texto = contenido.trim();
    if (!texto) return null;

    const nota: NotaEstudianteLibreta = {
      id: crypto.randomUUID(),
      contenido: texto,
      creadaEn: new Date().toISOString(),
      vinculos,
    };

    this.state.actualizarEstado((estado) => {
      estado.libreta.notasEstudiante.push(nota);
      sincronizarLibretaDesdeEstado(estado, this.state.caso());
    });

    return nota;
  }

  eliminarNota(notaId: string): boolean {
    let eliminada = false;

    this.state.actualizarEstado((estado) => {
      const indice = estado.libreta.notasEstudiante.findIndex((n) => n.id === notaId);
      if (indice === -1) return;
      estado.libreta.notasEstudiante.splice(indice, 1);
      eliminada = true;
      sincronizarLibretaDesdeEstado(estado, this.state.caso());
    });

    return eliminada;
  }
}
