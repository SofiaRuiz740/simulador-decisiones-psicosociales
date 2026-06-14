import { Routes } from '@angular/router';

export const SOLICITUDES_REAPERTURA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./solicitudes-reapertura').then((m) => m.SolicitudesReaperturaPage),
    title: 'Solicitudes de reapertura · Simulador',
  },
];
