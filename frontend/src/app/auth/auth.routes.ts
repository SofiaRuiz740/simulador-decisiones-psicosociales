import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth').then((m) => m.Auth),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () => import('./auth-entry/auth-entry').then((m) => m.AuthEntry),
        title: 'Iniciar sesión · Simulador',
      },
      {
        path: 'registro-docente',
        redirectTo: 'login?register=1',
        pathMatch: 'full',
      },
    ],
  },
];
