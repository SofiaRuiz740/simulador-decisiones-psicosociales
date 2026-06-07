import { Routes } from '@angular/router';

export const IA_GENERATIVA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./propuestas-list').then((m) => m.PropuestasListPage),
    title: 'IA generativa',
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./propuestas-list').then((m) => m.PropuestasListPage),
    title: 'IA generativa · Nueva propuesta',
  },
  {
    path: 'propuesta/:id',
    loadComponent: () =>
      import('./propuesta-detalle').then((m) => m.PropuestaDetallePage),
    title: 'Propuesta IA · Preview',
  },
  {
    path: 'propuesta/:id/editar',
    loadComponent: () =>
      import('./propuesta-editor').then((m) => m.PropuestaEditorPage),
    title: 'Editar propuesta · IA generativa',
  },
];
