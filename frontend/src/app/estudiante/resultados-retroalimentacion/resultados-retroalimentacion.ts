import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { ResultadoNarrativo } from '../../core/models/practicas.model';
import { ResultadosNarrativosService } from '../../core/services/resultados-narrativos.service';
import { EstudianteShellComponent } from '../estudiante-shell/estudiante-shell';

@Component({
  selector: 'app-resultados-retroalimentacion',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    EstudianteShellComponent,
  ],
  templateUrl: './resultados-retroalimentacion.html',
  styleUrl: './resultados-retroalimentacion.scss',
})
export class ResultadosRetroalimentacionPage implements OnInit {
  private readonly resultados = inject(ResultadosNarrativosService);

  readonly loading = signal(true);
  readonly lista = signal<ResultadoNarrativo[]>([]);
  readonly seleccionado = signal<ResultadoNarrativo | null>(null);

  ngOnInit(): void {
    this.resultados.misResultados().subscribe({
      next: (rows) => {
        this.lista.set(rows);
        if (rows.length > 0) this.seleccionado.set(rows[0]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  verDetalle(r: ResultadoNarrativo): void {
    this.seleccionado.set(r);
  }
}
