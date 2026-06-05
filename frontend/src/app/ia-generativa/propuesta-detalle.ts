import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  EstadoPropuestaIA,
  PropuestaCasoIA,
} from '../core/models/ia.model';
import { IaService } from '../core/services/ia.service';
import { GamePreview } from './components/game-preview/game-preview';

@Component({
  selector: 'app-propuesta-detalle',
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatSnackBarModule, MatChipsModule,
    MatDialogModule, MatDividerModule,
    MatFormFieldModule, MatInputModule,
    GamePreview,
  ],
  template: `
    <section class="page">
      <a routerLink="/ia-generativa" class="back-link">
        <mat-icon>arrow_back</mat-icon> Volver a propuestas
      </a>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (propuesta(); as p) {
        <header class="head anim-fade-up">
          <div class="head-text">
            <span class="ribbon" [class]="'estado-' + p.estado.toLowerCase()">
              {{ p.estado_display }}
            </span>
            <h1>{{ p.titulo }}</h1>
            <p class="sub">{{ p.objetivo_aprendizaje }}</p>
            <div class="meta">
              <span class="chip"><mat-icon>topic</mat-icon>{{ p.tema }}</span>
              <span class="chip"><mat-icon>tune</mat-icon>{{ p.nivel_dificultad }}</span>
              <span class="chip"><mat-icon>view_carousel</mat-icon>{{ p.numero_escenarios }} escenarios</span>
              @if (!p.generada_con_llm) {
                <span class="chip warn"><mat-icon>auto_stories</mat-icon>Plantilla pedagógica</span>
              }
            </div>
          </div>
          <div class="head-actions">
            @if (puedeAprobar()) {
              <button mat-stroked-button color="primary" (click)="aprobar()">
                <mat-icon>verified</mat-icon> Aprobar
              </button>
            }
            @if (puedeRechazar()) {
              <button mat-stroked-button color="warn" (click)="rechazar()">
                <mat-icon>thumb_down</mat-icon> Rechazar
              </button>
            }
            @if (puedeConvertir()) {
              <button mat-flat-button color="primary" (click)="convertir()">
                <mat-icon>library_add</mat-icon> Convertir en caso
              </button>
            }
            @if (p.caso_resultante_id) {
              <a mat-flat-button color="primary"
                [routerLink]="['/casos', p.caso_resultante_id]">
                <mat-icon>open_in_new</mat-icon> Abrir caso creado
              </a>
            }
          </div>
        </header>

        @if (p.motivo_rechazo) {
          <mat-card class="rechazo">
            <div class="rechazo-head">
              <mat-icon>warning</mat-icon>
              <strong>Motivo de rechazo</strong>
            </div>
            <p>{{ p.motivo_rechazo }}</p>
          </mat-card>
        }

        <app-game-preview [contenido]="p.contenido_json" />
      }
    </section>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; padding-bottom: 3rem; }
    .back-link {
      display: inline-flex; align-items: center; gap: 0.35rem;
      color: var(--mat-sys-primary); text-decoration: none;
      font-size: 0.9rem; width: max-content;
    }

    .head {
      display: flex; gap: 1rem; justify-content: space-between; align-items: flex-end;
      flex-wrap: wrap;
      padding: 1.5rem 1.75rem;
      border-radius: 20px;
      background: var(--mat-sys-surface);
      box-shadow: 0 8px 24px rgba(0,0,0,0.05);

      .head-text { flex: 1 1 380px; }
      .head-actions {
        display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;
        button, a { display: inline-flex; align-items: center; gap: 0.35rem; }
      }
      h1 {
        margin: 0.45rem 0 0.25rem;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 1.65rem; font-weight: 700;
      }
      .sub { margin: 0; color: var(--mat-sys-on-surface-variant); line-height: 1.5; max-width: 720px; }
      .meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.75rem; }
      .chip {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.2rem 0.6rem;
        background: var(--mat-sys-surface-container-low);
        border-radius: 999px;
        font-size: 0.78rem;
        color: var(--mat-sys-on-surface-variant);
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
        &.warn {
          background: color-mix(in srgb, var(--mat-sys-tertiary) 14%, transparent);
          color: var(--mat-sys-tertiary);
        }
      }
      .ribbon {
        display: inline-flex; align-items: center;
        padding: 0.22rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.04em;
        background: var(--mat-sys-surface-container);
        &.estado-en_revision { background: color-mix(in srgb, var(--mat-sys-tertiary) 16%, transparent); color: var(--mat-sys-tertiary); }
        &.estado-aprobado { background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent); color: var(--mat-sys-primary); }
        &.estado-rechazado { background: color-mix(in srgb, var(--mat-sys-error) 14%, transparent); color: var(--mat-sys-error); }
        &.estado-convertido_en_caso { background: color-mix(in srgb, var(--mat-sys-secondary) 18%, transparent); color: var(--mat-sys-secondary); }
      }
    }

    .rechazo {
      padding: 1rem 1.25rem;
      border-left: 4px solid var(--mat-sys-error);
      .rechazo-head { display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem; mat-icon { color: var(--mat-sys-error); } }
      p { margin: 0; line-height: 1.55; }
    }
  `],
})
export class PropuestaDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ia = inject(IaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly propuesta = signal<PropuestaCasoIA | null>(null);

  readonly puedeAprobar = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.EnRevision;
  });

  readonly puedeRechazar = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.EnRevision
        || p.estado === EstadoPropuestaIA.Aprobado;
  });

  readonly puedeConvertir = computed(() => {
    const p = this.propuesta();
    if (!p) return false;
    return p.estado === EstadoPropuestaIA.Aprobado
        || p.estado === EstadoPropuestaIA.EnRevision;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/ia-generativa']); return; }
    this.cargar(id);
  }

  cargar(id: number): void {
    this.loading.set(true);
    this.ia.obtenerPropuesta(id).subscribe({
      next: (p) => { this.propuesta.set(p); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudo cargar la propuesta.', 'OK', { duration: 3500 });
        this.router.navigate(['/ia-generativa']);
      },
    });
  }

  aprobar(): void {
    const p = this.propuesta();
    if (!p) return;
    this.ia.aprobarPropuesta(p.id).subscribe({
      next: (actualizada) => {
        this.propuesta.set(actualizada);
        this.snackBar.open('Propuesta aprobada.', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo aprobar.', 'OK', { duration: 3500 }),
    });
  }

  rechazar(): void {
    const p = this.propuesta();
    if (!p) return;
    const motivo = prompt('Motivo del rechazo (opcional):') ?? '';
    this.ia.rechazarPropuesta(p.id, motivo).subscribe({
      next: (actualizada) => {
        this.propuesta.set(actualizada);
        this.snackBar.open('Propuesta rechazada.', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo rechazar.', 'OK', { duration: 3500 }),
    });
  }

  convertir(): void {
    const p = this.propuesta();
    if (!p) return;
    if (!confirm('¿Convertir la propuesta en un caso editable? Quedará en estado EN_REVISIÓN dentro de Casos.')) return;
    this.ia.convertirEnCaso(p.id).subscribe({
      next: (res) => {
        this.snackBar.open(`Caso creado: "${res.caso_nombre}".`, 'Abrir', { duration: 4500 })
          .onAction().subscribe(() => this.router.navigate(['/casos', res.caso_id]));
        this.propuesta.set(res.propuesta);
      },
      error: (err) => {
        this.snackBar.open(
          err?.error?.detail || 'No se pudo convertir en caso.',
          'OK', { duration: 4000 },
        );
      },
    });
  }
}
