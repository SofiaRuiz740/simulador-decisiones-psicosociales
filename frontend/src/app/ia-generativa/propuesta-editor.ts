import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ContenidoIA, PropuestaCasoIA } from '../core/models/ia.model';
import { IaService } from '../core/services/ia.service';

@Component({
  selector: 'app-propuesta-editor',
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatProgressBarModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './propuesta-editor.html',
  styleUrl: './propuesta-editor.scss',
})
export class PropuestaEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ia = inject(IaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly propuesta = signal<PropuestaCasoIA | null>(null);
  readonly contenido = signal<ContenidoIA | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/ia-generativa']); return; }
    this.cargar(id);
  }

  private cargar(id: number): void {
    this.ia.obtenerPropuesta(id).subscribe({
      next: (p) => {
        this.propuesta.set(p);
        // copia profunda para no mutar referencia externa hasta que se guarde
        this.contenido.set(JSON.parse(JSON.stringify(p.contenido_json)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar la propuesta.', 'OK', { duration: 3500 });
        this.router.navigate(['/ia-generativa']);
      },
    });
  }

  /** Helpers para agregar/quitar items mutando el signal. */
  addOpcion(escIdx: number, pregIdx: number): void {
    const c = this.contenido();
    if (!c) return;
    c.escenarios[escIdx].preguntas[pregIdx].opciones.push({
      texto: 'Nueva opción',
      es_correcta: false,
      justificacion: '',
      retroalimentacion: '',
      impacto_narrativo: '',
    });
    this.contenido.set({ ...c });
  }

  delOpcion(escIdx: number, pregIdx: number, opIdx: number): void {
    const c = this.contenido();
    if (!c) return;
    const opciones = c.escenarios[escIdx].preguntas[pregIdx].opciones;
    if (opciones.length <= 2) {
      this.snackBar.open('Cada pregunta necesita al menos 2 opciones.', 'OK', { duration: 2500 });
      return;
    }
    opciones.splice(opIdx, 1);
    this.contenido.set({ ...c });
  }

  marcarCorrecta(escIdx: number, pregIdx: number, opIdx: number): void {
    const c = this.contenido();
    if (!c) return;
    c.escenarios[escIdx].preguntas[pregIdx].opciones.forEach((o, i) => {
      o.es_correcta = i === opIdx;
    });
    this.contenido.set({ ...c });
  }

  guardar(): void {
    const p = this.propuesta();
    const c = this.contenido();
    if (!p || !c) return;
    if (!this.validar(c)) return;

    this.guardando.set(true);
    this.ia.actualizarContenido(p.id, c).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.snackBar.open('Cambios guardados.', 'Volver al preview', { duration: 4000 })
          .onAction().subscribe(() => this.router.navigate(['/ia-generativa/propuesta', p.id]));
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err?.error?.detail || 'No se pudo guardar.';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  guardarYVolver(): void {
    const p = this.propuesta();
    const c = this.contenido();
    if (!p || !c) return;
    if (!this.validar(c)) return;

    this.guardando.set(true);
    this.ia.actualizarContenido(p.id, c).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/ia-generativa/propuesta', p.id]);
      },
      error: () => {
        this.guardando.set(false);
        this.snackBar.open('No se pudo guardar.', 'OK', { duration: 3500 });
      },
    });
  }

  private validar(c: ContenidoIA): boolean {
    if (!c.titulo?.trim()) {
      this.snackBar.open('El título no puede estar vacío.', 'OK', { duration: 3000 });
      return false;
    }
    for (const [i, esc] of c.escenarios.entries()) {
      for (const [j, p] of esc.preguntas.entries()) {
        if (!p.opciones.some((o) => o.es_correcta)) {
          this.snackBar.open(
            `La pregunta ${i + 1}.${j + 1} no tiene ninguna opción correcta.`,
            'OK', { duration: 3500 },
          );
          return false;
        }
      }
    }
    return true;
  }
}
