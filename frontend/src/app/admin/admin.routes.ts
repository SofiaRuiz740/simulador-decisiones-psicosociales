import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin').then((m) => m.Admin),
  },
  {
    path: 'docentes',
    loadComponent: () => import('./admin-docentes').then((m) => m.AdminDocentes),
    title: 'Docentes · Admin',
  },
  {
    path: 'actividad',
    loadComponent: () => import('./admin-actividad').then((m) => m.AdminActividad),
    title: 'Actividad del sistema · Admin',
  },
];
