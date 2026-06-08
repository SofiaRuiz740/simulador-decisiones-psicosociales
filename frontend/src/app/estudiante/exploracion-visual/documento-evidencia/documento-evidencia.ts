import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Evidencia } from '../../../core/simulacion-narrativa/models/evidencia.model';

@Component({
  selector: 'app-documento-evidencia',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="documento-overlay" role="dialog" aria-modal="true" (click)="cerrar.emit()">
      <article class="documento-panel" (click)="$event.stopPropagation()">
        <header class="documento-encabezado">
          <div>
            <span class="documento-tipo">{{ tipoLegible() }}</span>
            <h2>{{ evidencia().titulo }}</h2>
          </div>
          <button type="button" mat-icon-button aria-label="Cerrar documento" (click)="cerrar.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        @if (evidencia().descripcion) {
          <p class="documento-descripcion">{{ evidencia().descripcion }}</p>
        }
        <div class="documento-cuerpo">
          <pre>{{ evidencia().contenido ?? 'Sin contenido disponible.' }}</pre>
        </div>
        <footer class="documento-pie">
          <button mat-stroked-button type="button" (click)="cerrar.emit()">Guardar en libreta</button>
        </footer>
      </article>
    </div>
  `,
  styleUrl: './documento-evidencia.scss',
})
export class DocumentoEvidenciaComponent {
  readonly evidencia = input.required<Evidencia>();
  readonly cerrar = output<void>();

  tipoLegible(): string {
    const map: Record<string, string> = {
      registro_clinico: 'Registro clínico',
      comunicacion: 'Comunicación',
      documento: 'Documento',
      testimonio: 'Testimonio',
      observacion: 'Observación',
      material_forense: 'Material forense',
      otro: 'Documento',
    };
    return map[this.evidencia().tipo] ?? 'Documento';
  }
}
