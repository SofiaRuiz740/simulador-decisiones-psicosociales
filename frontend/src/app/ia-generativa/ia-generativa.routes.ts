import { Routes } from '@angular/router';

export const IA_GENERATIVA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./propuestas-list').then((m) => m.PropuestasListPage),
    title: 'IA generativa · Propuestas',
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./generar-caso').then((m) => m.GenerarCasoPage),
    title: 'Generar caso con IA',
  },
  {
    path: 'propuesta/:id',
    loadComponent: () =>
      import('./propuesta-detalle').then((m) => m.PropuestaDetallePage),
    title: 'Propuesta IA · Preview',
  },
];
