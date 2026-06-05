import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { AdminMetricas, ExtrasService } from '../core/services/extras.service';

interface KpiCard {
  label: string;
  value: number;
  icon: string;
  color: 'primary' | 'tertiary' | 'secondary' | 'success' | 'warn';
  link?: string;
}

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule, DecimalPipe, RouterLink,
    MatIconModule, MatProgressBarModule, MatTooltipModule,
  ],
  template: `
    <section class="page">
      <header class="hero anim-fade-up">
        <div class="hero-text">
          <span class="kicker">{{ saludo() }}</span>
          <h1>Centro de control</h1>
          <p>
            Vista panorámica del simulador: docentes activos, estudiantes,
            casos, prácticas en curso y rendimiento académico.
          </p>
        </div>
        <div class="hero-grade">
          <span class="num">{{ (metricas()?.nota_promedio ?? 0) | number:'1.1-1' }}</span>
          <span class="lbl">Nota promedio del sistema</span>
        </div>
      </header>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <div class="kpis">
        @for (k of kpis(); track k.label) {
          @if (k.link) {
            <a [routerLink]="k.link" class="kpi" [attr.data-tone]="k.color">
              <div class="kpi-icon"><mat-icon>{{ k.icon }}</mat-icon></div>
              <div class="kpi-body">
                <strong>{{ k.value }}</strong>
                <span>{{ k.label }}</span>
              </div>
              <mat-icon class="kpi-arrow">arrow_forward</mat-icon>
            </a>
          } @else {
            <div class="kpi" [attr.data-tone]="k.color">
              <div class="kpi-icon"><mat-icon>{{ k.icon }}</mat-icon></div>
              <div class="kpi-body">
                <strong>{{ k.value }}</strong>
                <span>{{ k.label }}</span>
              </div>
            </div>
          }
        }
      </div>

      <section class="panel anim-fade-up">
        <header class="panel-head">
          <div>
            <h2>Prácticas por estado</h2>
            <p>Distribución actual de las prácticas agendadas.</p>
          </div>
          <a routerLink="/practicas" class="link-mas">
            Ver prácticas <mat-icon>arrow_forward</mat-icon>
          </a>
        </header>

        @if (estadosLista().length === 0) {
          <p class="empty-line">Aún no hay prácticas en el sistema.</p>
        }

        <div class="bars">
          @for (e of estadosLista(); track e.key) {
            <div class="bar-row" [attr.data-estado]="e.key">
              <div class="bar-label">
                <mat-icon>{{ iconoEstado(e.key) }}</mat-icon>
                <span>{{ etiquetaEstado(e.key) }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="pctEstado(e.value)"></div>
              </div>
              <strong class="bar-num">{{ e.value }}</strong>
            </div>
          }
        </div>
      </section>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

    .hero {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1.5rem; flex-wrap: wrap;
      padding: 2rem 2.25rem;
      border-radius: 24px;
      background:
        radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--mat-sys-primary) 22%, transparent), transparent 55%),
        radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--mat-sys-tertiary) 18%, transparent), transparent 55%),
        var(--mat-sys-surface);
      box-shadow: 0 12px 32px color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);

      .hero-text {
        flex: 1 1 380px;
        .kicker {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
          color: var(--mat-sys-primary);
          border-radius: 999px;
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        h1 {
          margin: 0.5rem 0 0.35rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.15rem; font-weight: 800;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          -webkit-background-clip: text; background-clip: text; color: transparent;
          letter-spacing: -0.02em;
        }
        p { margin: 0; max-width: 580px; color: var(--mat-sys-on-surface-variant); line-height: 1.55; }
      }

      .hero-grade {
        padding: 1.25rem 1.75rem;
        border-radius: 22px;
        background: var(--mat-sys-surface);
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        text-align: center;
        min-width: 200px;

        .num {
          display: block;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 3rem; font-weight: 800;
          line-height: 1;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .lbl {
          margin-top: 0.35rem;
          font-size: 0.78rem; font-weight: 600;
          color: var(--mat-sys-on-surface-variant);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
      }
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem;
    }
    .kpi {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 1.05rem 1.15rem;
      background: var(--mat-sys-surface);
      border-radius: 18px;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
      text-decoration: none; color: inherit;
      transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
      position: relative; overflow: hidden;

      &::before {
        content: '';
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 4px;
        background: var(--mat-sys-primary);
      }
      &[data-tone="tertiary"]::before { background: var(--mat-sys-tertiary); }
      &[data-tone="secondary"]::before { background: var(--mat-sys-secondary); }
      &[data-tone="success"]::before { background: #43a047; }
      &[data-tone="warn"]::before { background: var(--mat-sys-error); }

      &[href]:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 28px rgba(0,0,0,0.08);
        border-color: var(--mat-sys-primary);
        .kpi-arrow { opacity: 1; transform: translateX(0); }
      }

      .kpi-icon {
        flex-shrink: 0;
        width: 46px; height: 46px;
        border-radius: 14px;
        background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
        color: var(--mat-sys-primary);
        display: inline-flex; align-items: center; justify-content: center;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      &[data-tone="tertiary"] .kpi-icon {
        background: color-mix(in srgb, var(--mat-sys-tertiary) 14%, transparent);
        color: var(--mat-sys-tertiary);
      }
      &[data-tone="secondary"] .kpi-icon {
        background: color-mix(in srgb, var(--mat-sys-secondary) 14%, transparent);
        color: var(--mat-sys-secondary);
      }
      &[data-tone="success"] .kpi-icon {
        background: color-mix(in srgb, #43a047 14%, transparent);
        color: #43a047;
      }

      .kpi-body {
        flex: 1; min-width: 0;
        display: flex; flex-direction: column;
        strong {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.8rem; font-weight: 800; line-height: 1;
        }
        span { font-size: 0.82rem; color: var(--mat-sys-on-surface-variant); margin-top: 2px; }
      }

      .kpi-arrow {
        opacity: 0;
        transform: translateX(-6px);
        color: var(--mat-sys-primary);
        transition: all 200ms ease;
      }
    }

    .panel {
      padding: 1.5rem 1.75rem;
      background: var(--mat-sys-surface);
      border-radius: 22px;
      border: 1px solid var(--mat-sys-outline-variant);
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);

      .panel-head {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 1rem; flex-wrap: wrap;
        margin-bottom: 1.25rem;

        h2 {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.2rem; font-weight: 700;
        }
        p { margin: 0.25rem 0 0; color: var(--mat-sys-on-surface-variant); font-size: 0.88rem; }
      }
      .link-mas {
        display: inline-flex; align-items: center; gap: 0.3rem;
        color: var(--mat-sys-primary);
        font-weight: 600; font-size: 0.9rem;
        text-decoration: none;
        mat-icon { font-size: 18px; width: 18px; height: 18px; transition: transform 200ms; }
        &:hover mat-icon { transform: translateX(3px); }
      }

      .empty-line { margin: 0; padding: 1rem; color: var(--mat-sys-on-surface-variant); text-align: center; }
    }

    .bars { display: flex; flex-direction: column; gap: 0.7rem; }
    .bar-row {
      display: grid;
      grid-template-columns: 180px 1fr 60px;
      align-items: center;
      gap: 0.85rem;

      .bar-label {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-weight: 600; font-size: 0.92rem;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-on-surface-variant); }
      }
      .bar-track {
        height: 10px;
        background: color-mix(in srgb, var(--mat-sys-on-surface) 6%, transparent);
        border-radius: 999px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
        transition: width 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
      }
      .bar-num {
        text-align: right;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 800;
        font-size: 1.05rem;
        color: var(--mat-sys-primary);
      }

      &[data-estado="EN_CURSO"] .bar-fill { background: linear-gradient(90deg, #42a5f5, var(--mat-sys-primary)); }
      &[data-estado="FINALIZADA"] .bar-fill { background: linear-gradient(90deg, #66bb6a, #43a047); }
      &[data-estado="CANCELADA"] .bar-fill { background: linear-gradient(90deg, var(--mat-sys-error), #ef5350); }
      &[data-estado="SIN_INICIAR"] .bar-fill { background: linear-gradient(90deg, #bdbdbd, #9e9e9e); }
    }

    @media (max-width: 720px) {
      .hero { padding: 1.5rem; }
      .hero h1 { font-size: 1.65rem !important; }
      .panel { padding: 1.25rem; }
      .bar-row { grid-template-columns: 130px 1fr 40px; gap: 0.5rem; }
    }
  `],
})
export class Admin implements OnInit {
  private readonly servicio = inject(ExtrasService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly metricas = signal<AdminMetricas | null>(null);

  readonly saludo = computed(() => {
    const u = this.auth.usuario();
    const nombre = u?.first_name || u?.username || 'admin';
    const h = new Date().getHours();
    const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    return `${sal}, ${nombre}`;
  });

  readonly kpis = computed<KpiCard[]>(() => {
    const m = this.metricas();
    return [
      { label: 'Docentes', value: m?.docentes ?? 0, icon: 'school', color: 'primary' },
      { label: 'Estudiantes', value: m?.estudiantes ?? 0, icon: 'group', color: 'tertiary', link: '/estudiantes' },
      { label: 'Grupos', value: m?.grupos ?? 0, icon: 'workspaces', color: 'secondary', link: '/grupos' },
      { label: 'Casos de estudio', value: m?.casos ?? 0, icon: 'menu_book', color: 'primary', link: '/casos' },
      { label: 'Prácticas', value: m?.practicas ?? 0, icon: 'event', color: 'success', link: '/practicas' },
      { label: 'Resultados', value: m?.resultados ?? 0, icon: 'assessment', color: 'tertiary', link: '/resultados' },
    ];
  });

  ngOnInit() {
    this.servicio.adminMetricas().subscribe({
      next: (m) => { this.metricas.set(m); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  estadosLista() {
    const m = this.metricas();
    if (!m) return [];
    return Object.entries(m.practicas_por_estado).map(([key, value]) => ({ key, value }));
  }

  pctEstado(value: number): number {
    const lista = this.estadosLista();
    const max = Math.max(...lista.map((e) => e.value));
    if (max <= 0) return 0;
    return Math.round((value / max) * 100);
  }

  etiquetaEstado(k: string): string {
    return ({
      SIN_INICIAR: 'Sin iniciar',
      EN_CURSO: 'En curso',
      FINALIZADA: 'Finalizadas',
      CANCELADA: 'Canceladas',
    } as Record<string, string>)[k] || k;
  }

  iconoEstado(k: string): string {
    return ({
      SIN_INICIAR: 'schedule',
      EN_CURSO: 'play_circle',
      FINALIZADA: 'check_circle',
      CANCELADA: 'cancel',
    } as Record<string, string>)[k] || 'circle';
  }
}
