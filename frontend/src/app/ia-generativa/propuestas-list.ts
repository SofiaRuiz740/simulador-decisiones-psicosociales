import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import {
  EstadoPropuestaIA,
  PropuestaCasoIA,
} from '../core/models/ia.model';
import { IaService } from '../core/services/ia.service';

@Component({
  selector: 'app-propuestas-list',
  imports: [
    CommonModule, FormsModule, RouterLink, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressBarModule, MatSnackBarModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <section class="page">
      <header class="hero anim-fade-up">
        <div>
          <h1>IA generativa</h1>
          <p class="sub">
            Genera casos psicosociales con apoyo de IA, revísalos como un juego
            y conviértelos en casos editables del simulador.
          </p>
        </div>
        <a mat-flat-button color="primary" class="btn-nuevo" routerLink="/ia-generativa/nuevo">
          <mat-icon>auto_awesome</mat-icon> Nueva propuesta
        </a>
      </header>

      <div class="toolbar">
        <mat-form-field appearance="outline" class="search">
          <mat-label>Buscar</mat-label>
          <input matInput [(ngModel)]="filtroTexto" placeholder="Tema u objetivo…" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" class="estado-sel">
          <mat-label>Estado</mat-label>
          <mat-select [(ngModel)]="filtroEstado">
            <mat-option value="">Todos</mat-option>
            <mat-option value="EN_REVISION">En revisión</mat-option>
            <mat-option value="APROBADO">Aprobado</mat-option>
            <mat-option value="RECHAZADO">Rechazado</mat-option>
            <mat-option value="CONVERTIDO_EN_CASO">Convertido en caso</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      @if (!loading() && propuestas().length === 0) {
        <div class="empty">
          <mat-icon>auto_awesome</mat-icon>
          <h3>Aún no hay propuestas</h3>
          <p>Crea tu primera propuesta de caso. La IA hará el primer borrador y tú revisas el resto.</p>
          <a mat-flat-button color="primary" routerLink="/ia-generativa/nuevo">
            <mat-icon>add</mat-icon> Generar la primera
          </a>
        </div>
      }

      <div class="grid">
        @for (p of filtradas(); track p.id) {
          <article class="card anim-fade-up" [routerLink]="['/ia-generativa/propuesta', p.id]">
            <div class="ribbon" [class]="'estado-' + p.estado.toLowerCase()">
              {{ p.estado_display }}
            </div>
            <div class="card-body">
              <h3>{{ p.titulo }}</h3>
              <p class="tema">{{ p.tema }}</p>
              <p class="obj">{{ p.objetivo_aprendizaje }}</p>
              <div class="meta">
                <span class="chip-meta"><mat-icon>view_carousel</mat-icon>{{ p.numero_escenarios }} escenarios</span>
                <span class="chip-meta"><mat-icon>quiz</mat-icon>{{ p.numero_preguntas_por_escenario }} preg/esc</span>
                <span class="chip-meta"><mat-icon>tune</mat-icon>{{ p.nivel_dificultad }}</span>
                @if (!p.generada_con_llm) {
                  <span class="chip-meta stub" matTooltip="Caso construido desde una plantilla pedagógica validada">
                    <mat-icon>auto_stories</mat-icon>Plantilla
                  </span>
                }
              </div>
              <div class="foot">
                <span class="fecha">{{ p.fecha_creacion | date:'medium' }}</span>
                <mat-icon class="arrow">arrow_forward</mat-icon>
              </div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem; }

    .hero {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1.5rem; flex-wrap: wrap;
      padding: 1.75rem 2rem;
      border-radius: 22px;
      background:
        radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--mat-sys-primary) 22%, transparent), transparent 55%),
        radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--mat-sys-tertiary) 18%, transparent), transparent 55%),
        var(--mat-sys-surface);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);

      h1 {
        margin: 0;
        font-size: 2rem; font-weight: 700;
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .sub { margin: 0.35rem 0 0; max-width: 580px; color: var(--mat-sys-on-surface-variant); }
      .btn-nuevo { height: 48px; padding: 0 1.4rem; border-radius: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.45rem; }
    }

    .toolbar {
      display: flex; gap: 0.5rem; flex-wrap: wrap;
      .search { min-width: 280px; flex: 1 1 280px; }
      .estado-sel { min-width: 180px; }
    }

    .empty {
      padding: 3.5rem 1.5rem; text-align: center;
      border: 1.5px dashed var(--mat-sys-outline-variant);
      border-radius: 18px;
      background: var(--mat-sys-surface);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary); opacity: 0.7; }
      h3 { margin: 0.5rem 0 0.25rem; }
      p { margin: 0 auto 1.25rem; max-width: 460px; color: var(--mat-sys-on-surface-variant); }
      a { display: inline-flex; align-items: center; gap: 0.4rem; }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 1rem;
    }

    .card {
      position: relative;
      cursor: pointer;
      display: flex; flex-direction: column;
      border-radius: 18px;
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      overflow: hidden;
      transition: transform 200ms ease, box-shadow 200ms ease;
      text-decoration: none; color: inherit;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 32px rgba(0,0,0,0.08);
        .arrow { transform: translateX(4px); }
      }

      .ribbon {
        position: absolute; top: 0.85rem; right: 0.85rem;
        padding: 0.25rem 0.65rem;
        font-size: 0.72rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.04em;
        border-radius: 999px;
        background: var(--mat-sys-surface-container);
        z-index: 1;
        &.estado-en_revision {
          background: color-mix(in srgb, var(--mat-sys-tertiary) 16%, transparent);
          color: var(--mat-sys-tertiary);
        }
        &.estado-aprobado {
          background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
          color: var(--mat-sys-primary);
        }
        &.estado-rechazado {
          background: color-mix(in srgb, var(--mat-sys-error) 14%, transparent);
          color: var(--mat-sys-error);
        }
        &.estado-convertido_en_caso {
          background: color-mix(in srgb, var(--mat-sys-secondary) 18%, transparent);
          color: var(--mat-sys-secondary);
        }
      }

      .card-body {
        padding: 1.25rem;
        display: flex; flex-direction: column; gap: 0.5rem;

        h3 {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.1rem; font-weight: 700;
          padding-right: 6rem;
          line-height: 1.3;
        }
        .tema { margin: 0; font-size: 0.88rem; color: var(--mat-sys-on-surface-variant); }
        .obj {
          margin: 0;
          font-size: 0.92rem; line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meta { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem; }
        .chip-meta {
          display: inline-flex; align-items: center; gap: 0.2rem;
          padding: 0.18rem 0.5rem;
          background: var(--mat-sys-surface-container-low);
          border-radius: 999px;
          font-size: 0.74rem;
          color: var(--mat-sys-on-surface-variant);
          mat-icon { font-size: 13px; width: 13px; height: 13px; }
        }
        .chip-meta.stub {
          background: color-mix(in srgb, var(--mat-sys-tertiary) 14%, transparent);
          color: var(--mat-sys-tertiary);
        }

        .foot {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--mat-sys-outline-variant);
          .fecha { font-size: 0.78rem; color: var(--mat-sys-on-surface-variant); }
          .arrow {
            color: var(--mat-sys-primary);
            transition: transform 200ms ease;
          }
        }
      }
    }
  `],
})
export class PropuestasListPage implements OnInit {
  private readonly ia = inject(IaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly propuestas = signal<PropuestaCasoIA[]>([]);
  filtroTexto = '';
  filtroEstado: EstadoPropuestaIA | '' = '';

  readonly filtradas = computed(() => {
    const txt = (this.filtroTexto || '').toLowerCase().trim();
    const est = this.filtroEstado;
    return this.propuestas().filter((p) => {
      if (est && p.estado !== est) return false;
      if (!txt) return true;
      return (
        p.titulo.toLowerCase().includes(txt) ||
        p.tema.toLowerCase().includes(txt) ||
        p.objetivo_aprendizaje.toLowerCase().includes(txt)
      );
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.ia.listarPropuestas().subscribe({
      next: (resp) => { this.propuestas.set(resp.results); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar las propuestas.', 'OK', { duration: 3500 });
      },
    });
  }
}
