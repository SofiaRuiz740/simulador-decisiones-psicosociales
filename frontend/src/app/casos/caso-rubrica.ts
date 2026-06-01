import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CriterioRubrica, NivelDesempeno, Rubrica } from '../core/models/casos.model';
import { CasosService } from '../core/services/casos.service';

function nuevoId(): string {
  return 'c' + Math.random().toString(36).slice(2, 8);
}

function nivelesPorDefecto(): NivelDesempeno[] {
  return [
    { nivel: 1, nombre: 'Incipiente', descriptor: '' },
    { nivel: 2, nombre: 'En desarrollo', descriptor: '' },
    { nivel: 3, nombre: 'Logrado', descriptor: '' },
    { nivel: 4, nombre: 'Sobresaliente', descriptor: '' },
  ];
}

function criterioVacio(plantilla: NivelDesempeno[]): CriterioRubrica {
  return {
    id: nuevoId(),
    nombre: '',
    descripcion: '',
    peso: 0,
    niveles: plantilla.map((n) => ({ ...n })),
  };
}

@Component({
  selector: 'app-caso-rubrica',
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatChipsModule, MatDividerModule, MatProgressBarModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './caso-rubrica.html',
  styleUrl: './caso-rubrica.scss',
})
export class CasoRubricaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(CasosService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly guardando = signal(false);
  readonly casoId = signal<number | null>(null);
  readonly rubrica = signal<Rubrica>({
    id: 0,
    caso: 0,
    descripcion: '',
    escala_maxima: 100,
    nota_aprobacion: 60,
    criterios: [],
    niveles_globales: nivelesPorDefecto(),
    suma_pesos_criterios: 0,
    es_consistente: false,
    fecha_creacion: '',
    fecha_actualizacion: '',
  });

  readonly sumaPesos = computed(() =>
    this.rubrica().criterios.reduce((acc, c) => acc + (Number(c.peso) || 0), 0),
  );

  readonly pesosOk = computed(() => this.sumaPesos() === 100);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/casos']); return; }
    this.casoId.set(id);
    this.servicio.obtenerRubrica(id).subscribe({
      next: (r) => {
        if (r) this.rubrica.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar la rúbrica.', 'OK', { duration: 3500 });
      },
    });
  }

  agregarCriterio(): void {
    const rub = this.rubrica();
    const c = criterioVacio(rub.niveles_globales?.length ? rub.niveles_globales : nivelesPorDefecto());
    this.rubrica.set({ ...rub, criterios: [...rub.criterios, c] });
  }

  eliminarCriterio(idx: number): void {
    const rub = this.rubrica();
    if (!confirm(`¿Eliminar el criterio "${rub.criterios[idx].nombre || 'sin nombre'}"?`)) return;
    const nuevos = rub.criterios.filter((_, i) => i !== idx);
    this.rubrica.set({ ...rub, criterios: nuevos });
  }

  distribuirPesosUniformes(): void {
    const rub = this.rubrica();
    const n = rub.criterios.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const sobrante = 100 - base * n;
    const criterios = rub.criterios.map((c, i) => ({
      ...c,
      peso: base + (i < sobrante ? 1 : 0),
    }));
    this.rubrica.set({ ...rub, criterios });
    this.snackBar.open('Pesos distribuidos uniformemente.', 'OK', { duration: 1800 });
  }

  agregarNivel(criterioIdx: number): void {
    const rub = this.rubrica();
    const cr = rub.criterios[criterioIdx];
    const maxNivel = cr.niveles.reduce((m, n) => Math.max(m, n.nivel), 0);
    const nuevoNivel: NivelDesempeno = { nivel: maxNivel + 1, nombre: '', descriptor: '' };
    const niveles = [...cr.niveles, nuevoNivel];
    const criterios = [...rub.criterios];
    criterios[criterioIdx] = { ...cr, niveles };
    this.rubrica.set({ ...rub, criterios });
  }

  eliminarNivel(criterioIdx: number, nivelIdx: number): void {
    const rub = this.rubrica();
    const cr = rub.criterios[criterioIdx];
    if (cr.niveles.length <= 1) {
      this.snackBar.open('Debe haber al menos un nivel.', 'OK', { duration: 2000 });
      return;
    }
    const niveles = cr.niveles.filter((_, i) => i !== nivelIdx);
    const criterios = [...rub.criterios];
    criterios[criterioIdx] = { ...cr, niveles };
    this.rubrica.set({ ...rub, criterios });
  }

  guardar(): void {
    const id = this.casoId();
    if (!id) return;
    if (!this.pesosOk()) {
      const ok = confirm(
        `La suma de pesos es ${this.sumaPesos()}, no 100. ` +
        `Se guardará igual pero el cálculo de nota usará el modo plano. ¿Continuar?`,
      );
      if (!ok) return;
    }
    const r = this.rubrica();
    this.guardando.set(true);
    this.servicio.guardarRubrica(id, {
      descripcion: r.descripcion,
      escala_maxima: r.escala_maxima,
      nota_aprobacion: r.nota_aprobacion,
      criterios: r.criterios,
      niveles_globales: r.niveles_globales,
    }).subscribe({
      next: (saved) => {
        this.rubrica.set(saved);
        this.guardando.set(false);
        this.snackBar.open('Rúbrica guardada.', 'OK', { duration: 2200 });
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err?.error?.detail || err?.error?.criterios?.[0] || 'No se pudo guardar.';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }
}
