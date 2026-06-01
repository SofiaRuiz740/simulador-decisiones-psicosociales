import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { AcademicoService } from '../core/services/academico.service';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  badge?: string;
  color?: 'primary' | 'tertiary' | 'secondary';
}

@Component({
  selector: 'app-docente',
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule],
  template: `
    <section class="page">

      <!-- Hero -->
      <header class="hero anim-fade-up">
        <div class="hero-text">
          <span class="kicker">{{ saludo() }}</span>
          <h1>Hola, {{ nombre() }}</h1>
          <p>
            Diseña casos, agenda prácticas y acompaña a tus estudiantes en
            decisiones psicosociales con sentido. Empieza por las acciones de abajo.
          </p>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <strong>{{ estudiantesCount() ?? '—' }}</strong>
            <span>Estudiantes</span>
          </div>
          <div class="stat">
            <strong>{{ gruposCount() ?? '—' }}</strong>
            <span>Grupos</span>
          </div>
        </div>
      </header>

      <!-- Accesos rápidos -->
      <h2 class="seccion-titulo">Empieza por aquí</h2>

      <div class="grid">
        @for (a of accesos(); track a.ruta; let i = $index) {
          <a [routerLink]="a.ruta" class="card-link"
            [style.--delay]="i * 0.05 + 's'">
            <article class="acceso-card elevated-card" [attr.data-color]="a.color || 'primary'">
              <div class="acceso-icon">
                <mat-icon>{{ a.icono }}</mat-icon>
              </div>
              <div class="acceso-body">
                <h3>{{ a.titulo }}</h3>
                <p>{{ a.descripcion }}</p>
              </div>
              <mat-icon class="arrow">arrow_forward</mat-icon>
            </article>
          </a>
        }
      </div>
    </section>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }

    .hero {
      display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;
      flex-wrap: wrap;
      padding: 2rem 2.25rem;
      border-radius: 24px;
      background:
        radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--mat-sys-primary) 22%, transparent), transparent 55%),
        radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--mat-sys-tertiary) 18%, transparent), transparent 55%),
        var(--mat-sys-surface);
      box-shadow: 0 12px 32px color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);

      .hero-text {
        flex: 1 1 420px;
        .kicker {
          display: inline-block;
          padding: 0.28rem 0.85rem;
          background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
          color: var(--mat-sys-primary);
          border-radius: 999px;
          font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        h1 {
          margin: 0.6rem 0 0.3rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 2.4rem; font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        p { margin: 0; color: var(--mat-sys-on-surface-variant); font-size: 1rem; max-width: 60ch; line-height: 1.55; }
      }

      .hero-stats {
        display: flex; gap: 0.85rem; flex-wrap: wrap;
        .stat {
          padding: 1rem 1.4rem;
          background: var(--mat-sys-surface);
          border-radius: 18px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
          min-width: 130px; text-align: center;
          strong {
            display: block;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 2rem; font-weight: 800; line-height: 1;
            background: linear-gradient(135deg, var(--mat-sys-primary), var(--mat-sys-tertiary));
            -webkit-background-clip: text; background-clip: text; color: transparent;
          }
          span {
            display: block;
            margin-top: 0.35rem;
            font-size: 0.74rem; color: var(--mat-sys-on-surface-variant);
            text-transform: uppercase; letter-spacing: 0.05em;
            font-weight: 600;
          }
        }
      }
    }

    .seccion-titulo {
      margin: 0.25rem 0 -0.5rem;
      font-size: 1.2rem; font-weight: 600;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .card-link {
      text-decoration: none; color: inherit;
      animation: fade-up 0.4s ease both;
      animation-delay: var(--delay, 0s);
    }

    .acceso-card {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem;
      transition: transform 0.15s, box-shadow 0.15s;
      cursor: pointer;
      position: relative; overflow: hidden;

      &::before {
        content: ''; position: absolute;
        top: -40%; right: -20%;
        width: 60%; height: 180%;
        background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
        transform: rotate(15deg);
        opacity: 0; transition: opacity 0.2s;
      }

      &:hover {
        transform: translateY(-3px);
        box-shadow:
          0 1px 2px rgba(0,0,0,0.04),
          0 18px 36px rgba(0,0,0,0.10);
        &::before { opacity: 1; }
      }

      .acceso-icon {
        width: 52px; height: 52px;
        border-radius: 14px;
        background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
        color: var(--mat-sys-primary);
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0; position: relative; z-index: 1;
        mat-icon { font-size: 26px; width: 26px; height: 26px; }
      }
      .acceso-body { flex: 1; min-width: 0; position: relative; z-index: 1; }
      h3 { margin: 0; font-size: 1.05rem; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; }
      p { margin: 0.15rem 0 0; font-size: 0.88rem; color: var(--mat-sys-on-surface-variant); line-height: 1.4; }

      .arrow {
        color: var(--mat-sys-on-surface-variant);
        transition: transform 0.15s, color 0.15s;
        position: relative; z-index: 1;
      }
      &:hover .arrow { transform: translateX(4px); color: var(--mat-sys-primary); }
    }

    .acceso-card[data-color="tertiary"] {
      .acceso-icon {
        background: color-mix(in srgb, var(--mat-sys-tertiary) 14%, transparent);
        color: var(--mat-sys-tertiary);
      }
    }

    @media (max-width: 720px) {
      .hero { padding: 1.5rem; }
      .hero h1 { font-size: 1.85rem !important; }
      .hero .hero-stats .stat { min-width: 100px; padding: 0.85rem 1rem; }
      .hero .hero-stats .stat strong { font-size: 1.55rem; }
    }
  `],
})
export class Docente implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly academico = inject(AcademicoService);

  readonly nombre = computed(
    () => this.auth.usuario()?.first_name || this.auth.usuario()?.username || 'docente',
  );

  readonly estudiantesCount = signal<number | null>(null);
  readonly gruposCount = signal<number | null>(null);

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly accesos = computed<AccesoRapido[]>(() => [
    {
      titulo: 'Estudiantes',
      descripcion: 'Registra, vincula y organiza tus estudiantes.',
      icono: 'group',
      ruta: '/estudiantes',
    },
    {
      titulo: 'Grupos',
      descripcion: 'Agrupa estudiantes para asignar prácticas en lote.',
      icono: 'workspaces',
      ruta: '/grupos',
    },
    {
      titulo: 'Casos de estudio',
      descripcion: 'Crea casos narrativos manualmente o asistido por IA.',
      icono: 'menu_book',
      ruta: '/casos',
    },
    {
      titulo: 'IA generativa',
      descripcion: 'Genera un caso completo a partir de un tema.',
      icono: 'auto_awesome',
      ruta: '/ia-generativa',
      color: 'tertiary',
    },
    {
      titulo: 'Importar documento',
      descripcion: 'Sube un PDF y conviértelo en un caso para revisar.',
      icono: 'upload_file',
      ruta: '/importacion-documentos',
      color: 'tertiary',
    },
    {
      titulo: 'Prácticas académicas',
      descripcion: 'Agenda prácticas y entrega códigos a tus estudiantes.',
      icono: 'event',
      ruta: '/practicas',
    },
    {
      titulo: 'Resultados',
      descripcion: 'Revisa notas, retroalimenta y descarga reportes.',
      icono: 'assessment',
      ruta: '/resultados',
    },
  ]);

  ngOnInit(): void {
    forkJoin({
      estudiantes: this.academico.listarEstudiantes(),
      grupos: this.academico.listarGrupos(),
    }).subscribe(({ estudiantes, grupos }) => {
      this.estudiantesCount.set(estudiantes.count);
      this.gruposCount.set(grupos.count);
    });
  }
}
