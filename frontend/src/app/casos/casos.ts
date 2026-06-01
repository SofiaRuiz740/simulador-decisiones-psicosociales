import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';

import { CasoListItem, EstadoCaso } from '../core/models/casos.model';
import { CasosService } from '../core/services/casos.service';
import { CasoFormDialog } from './dialogs/caso-form-dialog';

@Component({
  selector: 'app-casos',
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDialogModule, MatProgressBarModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <section class="page">
      <header class="hero anim-fade-up">
        <div class="hero-text">
          <h1>Casos de estudio</h1>
          <p class="sub">
            Diseña y gestiona los casos narrativos que tus estudiantes vivirán.
            Cada caso combina contexto, escenarios, preguntas y rúbrica.
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <strong>{{ casos().length }}</strong>
            <span>Totales</span>
          </div>
          <div class="stat">
            <strong>{{ contarPorEstado('VALIDADO') }}</strong>
            <span>Publicados</span>
          </div>
          <div class="stat">
            <strong>{{ contarPorEstado('BORRADOR') }}</strong>
            <span>En borrador</span>
          </div>
        </div>
      </header>

      <div class="toolbar">
        <div class="filters">
          <mat-form-field appearance="outline" class="search">
            <mat-label>Buscar</mat-label>
            <input matInput [(ngModel)]="filtroTexto" placeholder="Nombre o área…" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" class="estado-sel">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filtroEstado">
              <mat-option value="">Todos</mat-option>
              <mat-option value="BORRADOR">Borrador</mat-option>
              <mat-option value="EN_REVISION">En revisión</mat-option>
              <mat-option value="VALIDADO">Validado</mat-option>
              <mat-option value="ARCHIVADO">Archivado</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary" class="crear-btn" (click)="crear()">
          <mat-icon>add</mat-icon> Crear caso
        </button>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (!loading() && casos().length === 0) {
        <div class="empty">
          <mat-icon>menu_book</mat-icon>
          <h3>Aún no has creado casos</h3>
          <p>Empieza con tu primer caso narrativo. Te tomará pocos minutos.</p>
          <button mat-flat-button color="primary" (click)="crear()">
            <mat-icon>add</mat-icon> Crear el primero
          </button>
        </div>
      }

      <div class="grid">
        @for (c of filtrados(); track c.id) {
          <article class="card anim-fade-up" [class.archivado]="c.estado === 'ARCHIVADO'">
            <div class="ribbon" [class]="'estado-' + c.estado.toLowerCase()">
              {{ c.estado_display }}
            </div>
            <a [routerLink]="['/casos', c.id]" class="card-body">
              <h3>{{ c.nombre }}</h3>
              @if (c.descripcion) { <p class="desc">{{ c.descripcion }}</p> }
              <div class="meta">
                @if (c.area_psicosocial) {
                  <span class="chip-meta"><mat-icon>psychology</mat-icon>{{ c.area_psicosocial }}</span>
                }
                <span class="chip-meta"><mat-icon>view_carousel</mat-icon>{{ c.escenarios_count }} escenarios</span>
                <span class="chip-meta"><mat-icon>schedule</mat-icon>{{ c.tiempo_estimado_min }} min</span>
              </div>
            </a>
            <footer class="card-foot">
              <button mat-icon-button matTooltip="Editar metadatos" (click)="editar(c)">
                <mat-icon>edit</mat-icon>
              </button>
              <a mat-icon-button matTooltip="Abrir editor" [routerLink]="['/casos', c.id]">
                <mat-icon>open_in_new</mat-icon>
              </a>
              <a mat-icon-button matTooltip="Rúbrica" [routerLink]="['/casos', c.id, 'rubrica']">
                <mat-icon>checklist</mat-icon>
              </a>
              <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminar(c)">
                <mat-icon>delete</mat-icon>
              </button>
            </footer>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

    .hero {
      display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;
      flex-wrap: wrap;
      padding: 2rem 2rem;
      border-radius: 20px;
      background:
        radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--mat-sys-primary) 18%, transparent), transparent 55%),
        radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--mat-sys-tertiary) 16%, transparent), transparent 55%),
        var(--mat-sys-surface);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);

      .hero-text {
        flex: 1 1 380px;
        h1 {
          margin: 0;
          font-size: 1.95rem; font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .sub { margin: 0.4rem 0 0; max-width: 540px; color: var(--mat-sys-on-surface-variant); line-height: 1.5; }
      }

      .hero-stats {
        display: flex; gap: 1rem; flex-wrap: wrap;
        .stat {
          padding: 0.9rem 1.2rem;
          border-radius: 14px;
          background: var(--mat-sys-surface);
          box-shadow: 0 4px 14px rgba(0,0,0,0.04);
          min-width: 110px; text-align: center;
          strong {
            display: block;
            font-size: 1.7rem; font-weight: 700;
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: var(--mat-sys-primary);
            line-height: 1;
          }
          span { font-size: 0.78rem; color: var(--mat-sys-on-surface-variant); }
        }
      }
    }

    .toolbar {
      display: flex; gap: 0.75rem;
      justify-content: space-between; align-items: center;
      flex-wrap: wrap;

      .filters { display: flex; gap: 0.5rem; flex: 1 1 auto; flex-wrap: wrap; }
      .search { min-width: 240px; flex: 1 1 240px; }
      .estado-sel { min-width: 170px; }
      .crear-btn { display: inline-flex; align-items: center; gap: 0.35rem; height: 48px; padding: 0 1.2rem; border-radius: 12px; font-weight: 600; }
    }

    .empty {
      padding: 3.5rem 1.5rem;
      text-align: center;
      background: var(--mat-sys-surface);
      border-radius: 18px;
      border: 1.5px dashed var(--mat-sys-outline-variant);

      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary); opacity: 0.7; }
      h3 { margin: 0.5rem 0 0.25rem; }
      p { margin: 0 auto 1.25rem; max-width: 420px; color: var(--mat-sys-on-surface-variant); }
      button { display: inline-flex; align-items: center; gap: 0.4rem; }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 1rem;
    }

    .card {
      position: relative;
      display: flex; flex-direction: column;
      border-radius: 18px;
      background: var(--mat-sys-surface);
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      overflow: hidden;
      transition: transform 180ms ease, box-shadow 180ms ease;
      border: 1px solid var(--mat-sys-outline-variant);

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 28px rgba(0,0,0,0.08);
      }

      &.archivado { opacity: 0.65; }

      .ribbon {
        position: absolute; top: 0.85rem; right: 0.85rem;
        padding: 0.25rem 0.65rem;
        font-size: 0.72rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.04em;
        border-radius: 999px;
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        z-index: 1;
        &.estado-validado {
          background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
          color: var(--mat-sys-primary);
        }
        &.estado-borrador {
          background: color-mix(in srgb, var(--mat-sys-on-surface) 10%, transparent);
        }
        &.estado-archivado {
          background: color-mix(in srgb, var(--mat-sys-error) 12%, transparent);
          color: var(--mat-sys-error);
        }
        &.estado-en_revision {
          background: color-mix(in srgb, var(--mat-sys-tertiary) 16%, transparent);
          color: var(--mat-sys-tertiary);
        }
      }

      .card-body {
        flex: 1;
        padding: 1.25rem 1.25rem 0.5rem;
        display: flex; flex-direction: column; gap: 0.5rem;
        text-decoration: none; color: inherit;

        h3 {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.15rem; font-weight: 600;
          padding-right: 5.5rem; /* deja espacio al ribbon */
          line-height: 1.3;
        }
        .desc {
          margin: 0;
          color: var(--mat-sys-on-surface-variant);
          font-size: 0.92rem; line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .meta {
          display: flex; flex-wrap: wrap; gap: 0.4rem;
          margin-top: auto;
        }
        .chip-meta {
          display: inline-flex; align-items: center; gap: 0.25rem;
          padding: 0.2rem 0.55rem;
          background: var(--mat-sys-surface-container-low);
          border-radius: 999px;
          font-size: 0.78rem;
          color: var(--mat-sys-on-surface-variant);
          mat-icon { font-size: 14px; width: 14px; height: 14px; }
        }
      }

      .card-foot {
        display: flex; justify-content: flex-end; gap: 0.1rem;
        padding: 0.4rem 0.75rem 0.6rem;
        border-top: 1px solid var(--mat-sys-outline-variant);
        background: color-mix(in srgb, var(--mat-sys-primary) 2%, transparent);
      }
    }
  `],
})
export class Casos implements OnInit {
  private readonly servicio = inject(CasosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly casos = signal<CasoListItem[]>([]);
  filtroTexto = '';
  filtroEstado: EstadoCaso | '' = '';

  readonly filtrados = computed(() => {
    const txt = (this.filtroTexto || '').toLowerCase().trim();
    const est = this.filtroEstado;
    return this.casos().filter((c) => {
      if (est && c.estado !== est) return false;
      if (!txt) return true;
      return (
        c.nombre.toLowerCase().includes(txt) ||
        (c.area_psicosocial || '').toLowerCase().includes(txt) ||
        (c.descripcion || '').toLowerCase().includes(txt)
      );
    });
  });

  contarPorEstado(est: string): number {
    return this.casos().filter((c) => c.estado === est).length;
  }

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    this.servicio.listarCasos().subscribe({
      next: (resp) => { this.casos.set(resp.results); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('No se pudieron cargar los casos.', 'OK', { duration: 3500 }); },
    });
  }

  crear() {
    this.dialog.open(CasoFormDialog, { width: '560px', data: {} }).afterClosed().subscribe((c) => {
      if (c) {
        this.cargar();
        this.router.navigate(['/casos', c.id]);
      }
    });
  }

  editar(c: CasoListItem) {
    this.dialog.open(CasoFormDialog, { width: '560px', data: { caso: c } }).afterClosed().subscribe((r) => {
      if (r) this.cargar();
    });
  }

  eliminar(c: CasoListItem) {
    if (!confirm(`¿Eliminar el caso "${c.nombre}"? Se borrarán escenarios, preguntas y respuestas.`)) return;
    this.servicio.eliminarCaso(c.id).subscribe({
      next: () => { this.snackBar.open('Caso eliminado.', 'OK', { duration: 2500 }); this.cargar(); },
      error: () => this.snackBar.open('No se pudo eliminar.', 'OK', { duration: 3500 }),
    });
  }
}
