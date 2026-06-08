import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-salir-practica-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>¿Desea abandonar temporalmente la simulación?</h2>
    <mat-dialog-content>
      <p>Su progreso se guardará localmente. Podrá retomar la práctica desde el panel del estudiante.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="continuar()">Continuar</button>
      <button mat-flat-button color="primary" type="button" (click)="guardarYSalir()">
        Guardar y salir
      </button>
    </mat-dialog-actions>
  `,
})
export class SalirPracticaDialogComponent {
  private readonly ref = inject(MatDialogRef<SalirPracticaDialogComponent>);

  continuar(): void {
    this.ref.close(false);
  }

  guardarYSalir(): void {
    this.ref.close(true);
  }
}
