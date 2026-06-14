import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Layout de autenticación — split 50/50 como el mockup:
 * hero con imagen a la izquierda, panel con tarjeta de formulario a la derecha.
 */
@Component({
  selector: 'app-auth',
  imports: [CommonModule, RouterOutlet],
  template: `
    <main class="login-page">
      <section class="login-page__hero" aria-hidden="true">
        <img src="assets/psi-hero.png" alt="" class="login-page__hero-image" />
      </section>

      <section class="login-page__panel">
        <router-outlet />
      </section>
    </main>
  `,
  styles: [`:host { display: block; height: 100dvh; overflow: hidden; }`],
})
export class Auth {}
