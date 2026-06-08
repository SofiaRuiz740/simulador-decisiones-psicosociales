import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ConfigIntroduccionNarrativa } from '../models/introduccion.model';

@Injectable({ providedIn: 'root' })
export class IntroduccionLoaderService {
  private readonly http = inject(HttpClient);

  cargarConfig(casoId: string): Observable<ConfigIntroduccionNarrativa | null> {
    const url = `${environment.simulacionNarrativaDataUrl}/casos/${casoId}/introduccion.json`;
    return this.http.get<ConfigIntroduccionNarrativa>(url).pipe(
      catchError(() => of(null)),
    );
  }
}
