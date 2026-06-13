import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export interface MapaEscenasDialogData {
  escenas: { id: string; titulo: string; actual: boolean }[];
}

@Component({
  selector: 'app-mapa-escenas-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon aria-hidden="true">map</mat-icon>
      Mapa de escenas
    </h2>
    <mat-dialog-content>
      <p class="mapa-hint">
        Ubicaciones disponibles en esta práctica. La escena resaltada indica dónde se encuentra ahora.
      </p>
      <mat-nav-list class="mapa-lista">
        @for (escena of data.escenas; track escena.id) {
          <a mat-list-item [class.escena-actual]="escena.actual">
            <mat-icon matListItemIcon>{{ escena.actual ? 'my_location' : 'place' }}</mat-icon>
            <span matListItemTitle>{{ escena.titulo }}</span>
            @if (escena.actual) {
              <span matListItemLine class="actual-label">Ubicación actual</span>
            } @else {
              <span matListItemLine class="disponible-label">Disponible para explorar</span>
            }
          </a>
        }
      </mat-nav-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 0;
    }

    mat-dialog-content {
      padding-top: 8px;
    }

    .mapa-lista {
      padding-top: 4px;
    }

    .disponible-label {
      color: #94a3b8;
      font-size: 0.78rem;
    }
  `],
})
export class MapaEscenasDialogComponent {
  readonly data = inject<MapaEscenasDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MapaEscenasDialogComponent>);
}
