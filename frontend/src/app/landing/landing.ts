import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Si el usuario ya tiene sesión, lo enviamos a su dashboard. */
  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const destino = this.auth.dashboardDeRol(this.auth.rol());
      this.router.navigateByUrl(destino);
    }
  }

  readonly capabilities = [
    {
      num: '01',
      title: 'Casos psicosociales con sentido',
      lead: 'El docente diseña casos editables: contexto, escenarios, decisiones, rúbrica de evaluación con criterios y niveles de desempeño.',
      icon: 'menu_book',
    },
    {
      num: '02',
      title: 'Simulación narrativa de decisiones',
      lead: 'El estudiante vive el caso paso a paso. Cada decisión moviliza una teoría psicosocial y deja una huella en el análisis final.',
      icon: 'route',
    },
    {
      num: '03',
      title: 'Analítica con rúbrica viva',
      lead: 'Resultados con desglose por criterio, nivel alcanzado, retroalimentación y reportes descargables en PDF o Excel.',
      icon: 'insights',
    },
  ];

  readonly steps = [
    { n: '①', t: 'Diseñas el caso', d: 'Manualmente, con IA generativa, o importando un PDF.' },
    { n: '②', t: 'Agendas la práctica', d: 'Asignas estudiantes y entregas códigos de acceso.' },
    { n: '③', t: 'El estudiante decide', d: 'Vive la simulación narrativa con tiempo y progreso.' },
    { n: '④', t: 'Analizas resultados', d: 'Rúbrica, retroalimentación y descargas.' },
  ];

  readonly audiences = [
    {
      tag: 'Docentes',
      icon: 'school',
      title: 'Lleva la psicología social al aula',
      desc: 'Construye casos auténticos, evalúa con rúbrica explícita y acompaña con retroalimentación granular.',
    },
    {
      tag: 'Estudiantes',
      icon: 'psychology_alt',
      title: 'Aprende decidiendo, no memorizando',
      desc: 'Cada escenario es una decisión real con consecuencias narrativas. Lees, reflexionas, eliges, recibes feedback.',
    },
    {
      tag: 'Instituciones',
      icon: 'account_balance',
      title: 'Evidencia académica trazable',
      desc: 'Reportes por práctica, criterios estandarizados, datos exportables y trazabilidad de cada decisión.',
    },
  ];
}
