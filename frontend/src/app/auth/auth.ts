import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';

import { environment } from '../../environments/environment';

/**
 * Layout para autenticación (login, registro docente).
 * Split-screen editorial: panel izquierdo con identidad académica, derecho con formulario.
 */
@Component({
  selector: 'app-auth',
  imports: [CommonModule, RouterOutlet, RouterLink, MatIconModule],
  template: `
    <div class="split">

      <!-- BRAND PANEL (izquierda) -->
      <aside class="brand-panel">
        <a routerLink="/inicio" class="brand anim-fade-up">
          <svg class="mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="4" fill="#0d9488"/>
            <circle cx="30" cy="14" r="4" fill="white"/>
            <circle cx="20" cy="30" r="4" fill="#818cf8"/>
            <path d="M10 10 L30 14 L20 30 Z" stroke="white" stroke-width="1.2" stroke-linejoin="round" fill="none" opacity="0.5"/>
          </svg>
          <span>
            <strong>Simulador</strong>
            <em>de Decisiones Psicosociales</em>
          </span>
        </a>

        <div class="brand-inner">
          <span class="edition-num">№ Acceso</span>
          <h1 class="display-italic">
            <em>Decisiones</em> que enseñan,
            casos que <em>movilizan</em>.
          </h1>

          <p class="tagline">
            Una plataforma académica para diseñar y vivir casos de psicología
            social como experiencias de decisión real.
          </p>

          <ul class="features">
            <li>
              <span class="ft-icon"><mat-icon>menu_book</mat-icon></span>
              <div>
                <strong>Casos con rúbrica</strong>
                <em>Criterios, niveles y descriptores explícitos.</em>
              </div>
            </li>
            <li>
              <span class="ft-icon"><mat-icon>auto_awesome</mat-icon></span>
              <div>
                <strong>IA generativa opcional</strong>
                <em>Borradores de casos psicosociales en minutos.</em>
              </div>
            </li>
            <li>
              <span class="ft-icon"><mat-icon>insights</mat-icon></span>
              <div>
                <strong>Analítica trazable</strong>
                <em>Reportes PDF/Excel por práctica y estudiante.</em>
              </div>
            </li>
          </ul>
        </div>

        <footer class="brand-foot">
          <span>Universidad Alexander Von Humboldt</span>
          <span class="mono">2026</span>
        </footer>

        <!-- Decoración hairline -->
        <svg class="deco" viewBox="0 0 600 600" fill="none" aria-hidden="true">
          <line x1="0" y1="100" x2="600" y2="100" stroke="white" stroke-width="1" opacity="0.06"/>
          <line x1="0" y1="500" x2="600" y2="500" stroke="white" stroke-width="1" opacity="0.06"/>
          <line x1="100" y1="0" x2="100" y2="600" stroke="white" stroke-width="1" opacity="0.06"/>
          <line x1="500" y1="0" x2="500" y2="600" stroke="white" stroke-width="1" opacity="0.06"/>
          <circle cx="100" cy="100" r="3" fill="white" opacity="0.3"/>
          <circle cx="500" cy="500" r="3" fill="white" opacity="0.3"/>
        </svg>
      </aside>

      <!-- FORM PANEL (derecha) -->
      <main class="form-panel">
        <div class="form-wrap anim-fade-up">
          <router-outlet />
        </div>
      </main>

    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--app-paper); }

    .split {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      min-height: 100vh;
    }

    /* ============ BRAND PANEL ============ */
    .brand-panel {
      position: relative;
      color: white;
      background:
        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(13, 148, 136, 0.45), transparent 55%),
        radial-gradient(ellipse 50% 40% at 100% 0%, rgba(129, 140, 248, 0.30), transparent 50%),
        linear-gradient(135deg, #0B1729 0%, #0c2766 50%, #1e3a8a 100%);
      padding: clamp(2rem, 5vw, 4rem) clamp(2rem, 5vw, 3.5rem);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .deco {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      opacity: 0.7;
      z-index: 0;
    }

    .brand {
      position: relative; z-index: 1;
      display: inline-flex; align-items: center; gap: 0.75rem;
      text-decoration: none;
      width: max-content;

      .mark { width: 32px; height: 32px; }
      span {
        display: flex; flex-direction: column;
        line-height: 1.1;
      }
      strong {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1rem;
        color: white;
        letter-spacing: -0.01em;
      }
      em {
        font-family: var(--font-display);
        font-style: italic;
        font-weight: 500;
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.65);
        letter-spacing: -0.005em;
      }
    }

    .brand-inner {
      position: relative; z-index: 1;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin: clamp(1.5rem, 4vh, 3rem) 0;

      .edition-num {
        color: rgba(255, 255, 255, 0.5);
        font-family: var(--font-display);
        font-size: 0.85rem;
      }

      .display-italic {
        margin: 0;
        font-size: clamp(2rem, 3.5vw, 2.8rem);
        line-height: 1.05;
        color: white;
        em {
          font-style: italic;
          background: linear-gradient(180deg, #2dd4bf 0%, #818cf8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      }

      .tagline {
        margin: 0;
        font-size: 1rem;
        line-height: 1.55;
        color: rgba(255, 255, 255, 0.78);
        max-width: 440px;
      }
    }

    .features {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;

      li {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;

        .ft-icon {
          flex-shrink: 0;
          width: 38px; height: 38px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #2dd4bf;
          display: inline-flex; align-items: center; justify-content: center;
          mat-icon { font-size: 20px; width: 20px; height: 20px; }
        }
        div {
          display: flex; flex-direction: column;
          line-height: 1.3;
          strong {
            color: white;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.15rem;
          }
          em {
            font-style: normal;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.82rem;
            line-height: 1.45;
          }
        }
      }
    }

    .brand-foot {
      position: relative; z-index: 1;
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.55);

      .mono { color: rgba(255, 255, 255, 0.7); }
    }

    /* ============ FORM PANEL ============ */
    .form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      background: var(--app-paper);
      position: relative;
    }

    .form-wrap {
      width: 100%;
      max-width: 440px;
    }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 900px) {
      .split { grid-template-columns: 1fr; }
      .brand-panel {
        padding: 1.75rem 1.5rem 1.5rem;
        min-height: auto;
      }
      .brand-inner {
        gap: 0.85rem;
        margin: 1.25rem 0;

        .display-italic { font-size: 1.65rem; }
        .tagline { font-size: 0.92rem; }
      }
      .features { display: none; }
      .brand-foot { display: none; }
    }
  `],
})
export class Auth {
  readonly appName = environment.appName;
}
