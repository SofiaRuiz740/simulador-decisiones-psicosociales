import { Routes } from '@angular/router';

export const REINICIO_PRACTICAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reinicio-practicas').then((m) => m.ReinicioPracticasPage),
    title: 'Reinicio de prácticas · Simulador',
  },
];
