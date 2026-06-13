import { Routes } from '@angular/router';

import { estudianteAuthGuard } from './guards/estudiante-auth.guard';

export const ESTUDIANTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./estudiante').then((m) => m.Estudiante),
    title: 'Acceso estudiante · Simulador',
  },
  {
    path: 'panel',
    canActivate: [estudianteAuthGuard],
    loadComponent: () => import('./panel-estudiante/panel-estudiante').then((m) => m.PanelEstudianteComponent),
    title: 'Panel estudiante · Simulador',
  },
  {
    path: 'practicas',
    canActivate: [estudianteAuthGuard],
    loadComponent: () => import('./mis-practicas/mis-practicas').then((m) => m.MisPracticasComponent),
    title: 'Mis prácticas · Simulador',
  },
  {
    path: 'practicas/:practicaId',
    canActivate: [estudianteAuthGuard],
    loadComponent: () => import('./practica-info/practica-info').then((m) => m.PracticaInfoComponent),
    title: 'Información de práctica · Simulador',
  },
  {
    path: 'practicas/:practicaId/simulacion',
    canActivate: [estudianteAuthGuard],
    loadComponent: () =>
      import('./simulacion-narrativa/simulacion-narrativa').then((m) => m.SimulacionNarrativa),
    title: 'Simulación narrativa · Simulador',
  },
  {
    path: 'simulacion',
    redirectTo: 'panel',
    pathMatch: 'full',
  },
  {
    path: 'simulacion-narrativa/:casoId',
    canActivate: [estudianteAuthGuard],
    loadComponent: () =>
      import('./simulacion-narrativa/simulacion-narrativa').then((m) => m.SimulacionNarrativa),
    title: 'Simulación narrativa · Simulador',
  },
  {
    path: 'simulacion-narrativa',
    redirectTo: 'panel',
    pathMatch: 'full',
  },
  {
    path: 'resultado/:id',
    canActivate: [estudianteAuthGuard],
    loadComponent: () => import('./resultado').then((m) => m.ResultadoEstudiante),
    title: 'Resultado · Simulador',
  },
  {
    path: 'resultados',
    canActivate: [estudianteAuthGuard],
    loadComponent: () =>
      import('./resultados-retroalimentacion/resultados-retroalimentacion').then(
        (m) => m.ResultadosRetroalimentacionPage,
      ),
    title: 'Resultados y retroalimentación · Simulador',
  },
];
