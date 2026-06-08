import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, switchMap } from 'rxjs';

import { CasoNarrativoCompleto } from '../models';
import { ensamblarCasoNarrativo } from '../utils/caso-assembler';
import { NarrativaDataService } from './narrativa-data.service';

@Injectable({ providedIn: 'root' })
export class CasoNarrativoLoaderService {
  private readonly data = inject(NarrativaDataService);

  cargarCaso(casoId: string): Observable<CasoNarrativoCompleto> {
    return this.data.cargarManifest(casoId).pipe(
      switchMap((manifest) =>
        forkJoin({
          escenarios: this.data.cargarEscenarios(casoId, manifest.escenarios),
          personajes: this.data.cargarPersonajes(casoId, manifest.personajes),
          conversaciones: this.data.cargarConversaciones(casoId, manifest.conversaciones),
          evidencias: this.data.cargarEvidencias(casoId, manifest.evidencias),
          contradicciones: this.data.cargarContradicciones(casoId, manifest.contradicciones),
          hipotesis: this.data.cargarHipotesis(casoId, manifest.hipotesis),
          intervenciones: this.data.cargarIntervenciones(casoId, manifest.intervenciones),
          eventos: this.data.cargarEventos(casoId, manifest.eventos ?? []),
          objetivos: this.data.cargarObjetivos(casoId, manifest.objetivos ?? []),
        }).pipe(
          map((entidades) =>
            ensamblarCasoNarrativo(
              manifest,
              entidades.escenarios,
              entidades.personajes,
              entidades.conversaciones,
              entidades.evidencias,
              entidades.contradicciones,
              entidades.hipotesis,
              entidades.intervenciones,
              entidades.eventos,
              entidades.objetivos,
            ),
          ),
        ),
      ),
    );
  }
}
