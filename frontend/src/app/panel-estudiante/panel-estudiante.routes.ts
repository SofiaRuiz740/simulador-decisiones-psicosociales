import { Routes } from '@angular/router';

export const PANEL_ESTUDIANTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./inicio').then((m) => m.PanelEstudianteInicio),
    title: 'Inicio · Estudiante',
  },
  {
    path: 'practicas',
    loadComponent: () => import('./mis-practicas').then((m) => m.MisPracticas),
    title: 'Mis prácticas · Estudiante',
  },
];
