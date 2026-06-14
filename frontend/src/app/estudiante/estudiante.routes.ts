import { Routes } from '@angular/router';

import { estudianteAuthGuard } from './guards/estudiante-auth.guard';

export const ESTUDIANTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
  {
    path: 'panel',
    redirectTo: '/panel-estudiante',
    pathMatch: 'full',
  },
  {
    path: 'practicas',
    redirectTo: '/panel-estudiante/practicas',
    pathMatch: 'full',
  },
  {
    path: 'practicas/:practicaId/simulacion',
    canActivate: [estudianteAuthGuard],
    loadComponent: () =>
      import('./simulacion-narrativa/simulacion-narrativa').then((m) => m.SimulacionNarrativa),
    title: 'Simulación narrativa · Simulador',
  },
  {
    path: 'practicas/:practicaId',
    redirectTo: (route) => `/panel-estudiante/practicas/${route.params['practicaId']}`,
  },
  {
    path: 'simulacion',
    redirectTo: '/panel-estudiante',
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
    redirectTo: '/panel-estudiante',
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
