import { Routes } from '@angular/router';

export const MATERIAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./materias').then((m) => m.Materias),
    title: 'Materias · Simulador',
  },
];
