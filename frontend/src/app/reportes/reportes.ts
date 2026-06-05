import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Practica } from '../core/models/practicas.model';
import { ExtrasService } from '../core/services/extras.service';
import { PracticasService } from '../core/services/practicas.service';

@Component({
  selector: 'app-reportes',
  imports: [
    CommonModule, DatePipe,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <section class="page">
      <header class="hero-block anim-fade-up">
        <div class="hero-text">
          <span class="kicker">Análisis</span>
          <h1>Reportes</h1>
          <p>
            Descarga reportes en PDF o Excel con los resultados de cada práctica:
            participantes, decisiones, calificaciones y desglose por criterio.
          </p>
        </div>
        <div class="hero-icon">
          <mat-icon>description</mat-icon>
        </div>
      </header>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (!loading() && practicas().length === 0) {
        <div class="empty-state">
          <mat-icon>folder_off</mat-icon>
          <h3>Aún no hay prácticas disponibles</h3>
          <p>Para generar reportes primero debes agendar y ejecutar prácticas con estudiantes.</p>
        </div>
      }

      <div class="cards-grid">
        @for (p of practicas(); track p.id) {
          <article class="rep-card anim-fade-up">
            <div class="head">
              <div class="icono"><mat-icon>event</mat-icon></div>
              <div class="info">
                <strong>{{ p.nombre }}</strong>
                <span>{{ p.caso_nombre }}</span>
              </div>
              <span class="ribbon" [class]="'estado-' + p.estado.toLowerCase()">{{ p.estado_display }}</span>
            </div>

            <div class="meta">
              <span class="chip-meta"><mat-icon>play_arrow</mat-icon>{{ p.fecha_inicio | date:'short' }}</span>
              <span class="chip-meta"><mat-icon>flag</mat-icon>{{ p.fecha_fin | date:'short' }}</span>
              <span class="chip-meta"><mat-icon>group</mat-icon>{{ p.autorizaciones_count }} autorizados</span>
            </div>

            <div class="descargas">
              <button mat-stroked-button color="primary" class="btn-d"
                (click)="descargarPDF(p)"
                [disabled]="descargando() === p.id + '-pdf'">
                <mat-icon>picture_as_pdf</mat-icon>
                <div class="d-text">
                  <strong>PDF</strong>
                  <span>Reporte narrativo</span>
                </div>
              </button>
              <button mat-stroked-button color="primary" class="btn-d"
                (click)="descargarExcel(p)"
                [disabled]="descargando() === p.id + '-xlsx'">
                <mat-icon>table_chart</mat-icon>
                <div class="d-text">
                  <strong>Excel</strong>
                  <span>Datos para análisis</span>
                </div>
              </button>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; }

    .hero-block .hero-icon {
      flex-shrink: 0;
      width: 80px; height: 80px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
      color: var(--mat-sys-on-primary);
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 30px color-mix(in srgb, var(--mat-sys-primary) 35%, transparent);
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
    }

    .rep-card {
      display: flex; flex-direction: column; gap: 0.85rem;
      padding: 1.15rem 1.2rem;
      background: var(--mat-sys-surface);
      border-radius: 18px;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    }

    .head {
      display: flex; align-items: center; gap: 0.65rem;

      .icono {
        flex-shrink: 0;
        width: 44px; height: 44px;
        border-radius: 14px;
        background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
        color: var(--mat-sys-on-primary);
        display: inline-flex; align-items: center; justify-content: center;
        mat-icon { font-size: 22px; width: 22px; height: 22px; }
      }
      .info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
      .info strong {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700; font-size: 1rem;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .info span { font-size: 0.82rem; color: var(--mat-sys-on-surface-variant); }
      .ribbon {
        padding: 0.18rem 0.55rem; font-size: 0.7rem; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.04em;
        border-radius: 999px;
        background: var(--mat-sys-surface-container);
        &.estado-en_curso { background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent); color: var(--mat-sys-primary); }
        &.estado-finalizada { background: color-mix(in srgb, #43a047 18%, transparent); color: #2e7d32; }
        &.estado-cancelada { background: color-mix(in srgb, var(--mat-sys-error) 14%, transparent); color: var(--mat-sys-error); }
      }
    }

    .meta { display: flex; flex-wrap: wrap; gap: 0.35rem; }

    .descargas {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .btn-d {
      display: flex; align-items: center; gap: 0.55rem;
      height: auto; min-height: 56px;
      padding: 0.7rem 0.85rem !important;
      border-radius: 14px;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: var(--mat-sys-primary); }
      .d-text {
        display: flex; flex-direction: column;
        text-align: left;
        strong { font-size: 0.92rem; font-weight: 700; }
        span { font-size: 0.7rem; color: var(--mat-sys-on-surface-variant); }
      }
    }

    @media (max-width: 600px) {
      .descargas { grid-template-columns: 1fr; }
    }
  `],
})
export class Reportes implements OnInit {
  private readonly practicasSrv = inject(PracticasService);
  private readonly extras = inject(ExtrasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly practicas = signal<Practica[]>([]);
  readonly descargando = signal<string | null>(null);

  ngOnInit(): void {
    this.practicasSrv.listar().subscribe({
      next: (r) => { this.practicas.set(r.results); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar las prácticas.', 'OK', { duration: 3500 });
      },
    });
  }

  descargarPDF(p: Practica): void {
    this.descargando.set(`${p.id}-pdf`);
    this.extras.descargarReportePracticaPDF(p.id).subscribe({
      next: (blob) => {
        this.descargar(blob, `reporte-practica-${p.id}.pdf`);
        this.descargando.set(null);
      },
      error: () => {
        this.descargando.set(null);
        this.snackBar.open('No se pudo generar el PDF.', 'OK', { duration: 3500 });
      },
    });
  }

  descargarExcel(p: Practica): void {
    this.descargando.set(`${p.id}-xlsx`);
    this.extras.descargarReportePracticaExcel(p.id).subscribe({
      next: (blob) => {
        this.descargar(blob, `reporte-practica-${p.id}.xlsx`);
        this.descargando.set(null);
      },
      error: () => {
        this.descargando.set(null);
        this.snackBar.open('No se pudo generar el Excel.', 'OK', { duration: 3500 });
      },
    });
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
