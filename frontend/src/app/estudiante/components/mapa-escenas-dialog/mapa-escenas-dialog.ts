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
      <p class="mapa-hint">Ubicaciones exploradas en esta práctica.</p>
      <mat-nav-list>
        @for (escena of data.escenas; track escena.id) {
          <a mat-list-item [class.escena-actual]="escena.actual">
            <mat-icon matListItemIcon>{{ escena.actual ? 'location_on' : 'place' }}</mat-icon>
            <span matListItemTitle>{{ escena.titulo }}</span>
            @if (escena.actual) {
              <span matListItemLine class="actual-label">Ubicación actual</span>
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
    h2 { display: flex; align-items: center; gap: 8px; }
    .mapa-hint { margin: 0 0 8px; color: var(--mat-sys-on-surface-variant); font-size: 0.9rem; }
    .escena-actual { background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent); }
    .actual-label { color: var(--mat-sys-primary); font-size: 0.8rem; }
  `],
})
export class MapaEscenasDialogComponent {
  readonly data = inject<MapaEscenasDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MapaEscenasDialogComponent>);
}
