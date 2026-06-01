import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';

import { EstadoPractica, Practica } from '../core/models/practicas.model';
import { PracticasService } from '../core/services/practicas.service';
import { PracticaFormDialog } from './dialogs/practica-form-dialog';

@Component({
  selector: 'app-practicas',
  imports: [
    CommonModule, DatePipe, FormsModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatDialogModule, MatProgressBarModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <section class="page">
      <header class="hero-block anim-fade-up">
        <div class="hero-text">
          <span class="kicker">Práctica</span>
          <h1>Prácticas académicas</h1>
          <p>
            Agenda sesiones de simulación con códigos de acceso para tus estudiantes.
            Aquí ves el estado de cada práctica y el avance de los participantes.
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat"><strong>{{ practicas().length }}</strong><span>Totales</span></div>
          <div class="stat"><strong>{{ contar('EN_CURSO') }}</strong><span>En curso</span></div>
          <div class="stat"><strong>{{ contar('FINALIZADA') }}</strong><span>Finalizadas</span></div>
        </div>
      </header>

      <div class="toolbar">
        <div class="filtros">
          <mat-form-field appearance="outline" class="busqueda">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtroTexto" placeholder="Nombre o caso…" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" class="estado-sel">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filtroEstado">
              <mat-option value="">Todos</mat-option>
              <mat-option value="SIN_INICIAR">Sin iniciar</mat-option>
              <mat-option value="EN_CURSO">En curso</mat-option>
              <mat-option value="FINALIZADA">Finalizada</mat-option>
              <mat-option value="CANCELADA">Cancelada</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary" class="btn-pill" (click)="crear()">
          <mat-icon>add</mat-icon> Nueva práctica
        </button>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (!loading() && practicas().length === 0) {
        <div class="empty-state">
          <mat-icon>event</mat-icon>
          <h3>Aún no hay prácticas</h3>
          <p>Agenda una práctica vinculando un caso, una fecha y autorizando estudiantes.</p>
          <button mat-flat-button color="primary" (click)="crear()">
            <mat-icon>add</mat-icon> Crear la primera
          </button>
        </div>
      }

      <div class="cards-grid">
        @for (p of filtradas(); track p.id) {
          <article class="card anim-fade-up" [routerLink]="['/practicas', p.id]">
            <div class="ribbon" [class]="'estado-' + p.estado.toLowerCase()">
              {{ p.estado_display }}
            </div>
            <div class="card-body">
              <div class="head">
                <div class="icono"><mat-icon>event</mat-icon></div>
                <div>
                  <h3>{{ p.nombre }}</h3>
                  <p class="caso">{{ p.caso_nombre }}</p>
                </div>
              </div>

              <div class="meta">
                <span class="chip-meta"><mat-icon>schedule</mat-icon>{{ p.tiempo_max_min }} min</span>
                <span class="chip-meta"><mat-icon>group</mat-icon>{{ p.autorizaciones_count }} autorizados</span>
                @if (p.lugar_fisico) {
                  <span class="chip-meta"><mat-icon>place</mat-icon>{{ p.lugar_fisico }}</span>
                }
              </div>

              <div class="fechas">
                <div class="fecha-row">
                  <mat-icon>play_arrow</mat-icon>
                  <div>
                    <small>Inicio</small>
                    <strong>{{ p.fecha_inicio | date:'short' }}</strong>
                  </div>
                </div>
                <div class="fecha-row">
                  <mat-icon>flag</mat-icon>
                  <div>
                    <small>Fin</small>
                    <strong>{{ p.fecha_fin | date:'short' }}</strong>
                  </div>
                </div>
              </div>

              <div class="foot">
                <button mat-icon-button color="warn" matTooltip="Eliminar"
                  (click)="eliminar(p, $event)">
                  <mat-icon>delete</mat-icon>
                </button>
                <span class="abrir">
                  Abrir <mat-icon>arrow_forward</mat-icon>
                </span>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; }

    .toolbar {
      display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;
      .filtros { display: flex; gap: 0.5rem; flex: 1 1 360px; flex-wrap: wrap; }
      .busqueda { min-width: 240px; flex: 1 1 240px; }
      .estado-sel { min-width: 180px; }
    }

    .card {
      position: relative;
      display: flex; flex-direction: column;
      background: var(--mat-sys-surface);
      border-radius: 18px;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      overflow: hidden;
      cursor: pointer;
      text-decoration: none; color: inherit;
      transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 32px rgba(0,0,0,0.08);
        border-color: var(--mat-sys-primary);
        .abrir mat-icon { transform: translateX(4px); }
      }

      .ribbon {
        position: absolute; top: 0.85rem; right: 0.85rem;
        padding: 0.2rem 0.6rem;
        font-size: 0.7rem; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.05em;
        border-radius: 999px;
        background: var(--mat-sys-surface-container);
        z-index: 1;
        &.estado-sin_iniciar { background: color-mix(in srgb, #9e9e9e 24%, transparent); color: #616161; }
        &.estado-en_curso { background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent); color: var(--mat-sys-primary); }
        &.estado-finalizada { background: color-mix(in srgb, #43a047 18%, transparent); color: #2e7d32; }
        &.estado-cancelada { background: color-mix(in srgb, var(--mat-sys-error) 14%, transparent); color: var(--mat-sys-error); }
      }

      .card-body {
        padding: 1.15rem 1.25rem;
        display: flex; flex-direction: column; gap: 0.75rem;
      }

      .head {
        display: flex; gap: 0.7rem; align-items: flex-start;
        padding-right: 5rem;

        .icono {
          flex-shrink: 0;
          width: 44px; height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          color: var(--mat-sys-on-primary);
          display: inline-flex; align-items: center; justify-content: center;
          mat-icon { font-size: 22px; width: 22px; height: 22px; }
        }
        h3 {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.05rem; font-weight: 700;
          line-height: 1.3;
        }
        .caso { margin: 0.15rem 0 0; font-size: 0.85rem; color: var(--mat-sys-on-surface-variant); }
      }

      .meta { display: flex; flex-wrap: wrap; gap: 0.35rem; }

      .fechas {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
        padding: 0.6rem;
        background: var(--mat-sys-surface-container-low);
        border-radius: 12px;

        .fecha-row {
          display: flex; align-items: center; gap: 0.45rem;

          mat-icon {
            color: var(--mat-sys-primary);
            font-size: 18px; width: 18px; height: 18px;
            background: var(--mat-sys-surface);
            border-radius: 8px;
            padding: 0.3rem;
          }
          small {
            display: block;
            text-transform: uppercase;
            font-size: 0.65rem;
            color: var(--mat-sys-on-surface-variant);
            letter-spacing: 0.05em;
          }
          strong {
            display: block;
            font-size: 0.78rem;
            font-weight: 700;
          }
        }
      }

      .foot {
        display: flex; justify-content: space-between; align-items: center;
        padding-top: 0.4rem;
        border-top: 1px solid var(--mat-sys-outline-variant);

        .abrir {
          display: inline-flex; align-items: center; gap: 0.25rem;
          color: var(--mat-sys-primary);
          font-weight: 700; font-size: 0.85rem;
          mat-icon { font-size: 18px; width: 18px; height: 18px; transition: transform 200ms; }
        }
      }
    }
  `],
})
export class Practicas implements OnInit {
  private readonly servicio = inject(PracticasService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly practicas = signal<Practica[]>([]);
  filtroTexto = '';
  filtroEstado: EstadoPractica | '' = '';

  readonly filtradas = computed(() => {
    const txt = this.filtroTexto.toLowerCase().trim();
    const est = this.filtroEstado;
    return this.practicas().filter((p) => {
      if (est && p.estado !== est) return false;
      if (!txt) return true;
      return (
        p.nombre.toLowerCase().includes(txt) ||
        (p.caso_nombre || '').toLowerCase().includes(txt)
      );
    });
  });

  contar(estado: string): number {
    return this.practicas().filter((p) => p.estado === estado).length;
  }

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.servicio.listar().subscribe({
      next: (r) => { this.practicas.set(r.results); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar las prácticas.', 'OK', { duration: 3500 });
      },
    });
  }

  crear() {
    this.dialog.open(PracticaFormDialog, { width: '600px' }).afterClosed().subscribe((p) => {
      if (p) { this.cargar(); this.router.navigate(['/practicas', p.id]); }
    });
  }

  eliminar(p: Practica, ev: Event) {
    ev.preventDefault(); ev.stopPropagation();
    if (!confirm(`¿Eliminar la práctica "${p.nombre}"? Se borrarán las autorizaciones y participaciones.`)) return;
    this.servicio.eliminar(p.id).subscribe({
      next: () => { this.snackBar.open('Práctica eliminada.', 'OK', { duration: 2500 }); this.cargar(); },
      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),
    });
  }
}
