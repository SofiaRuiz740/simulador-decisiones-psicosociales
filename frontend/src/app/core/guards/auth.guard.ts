import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

function esRutaEstudiante(route: ActivatedRouteSnapshot): boolean {
  let r: ActivatedRouteSnapshot | null = route;
  while (r) {
    if (r.routeConfig?.path === 'panel-estudiante') return true;
    r = r.parent;
  }
  return false;
}

/**
 * Permite el acceso a la ruta solo si hay un usuario autenticado.
 * Estudiantes sin sesión van a /estudiante; docentes/admin a /auth.
 */
export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([esRutaEstudiante(route) ? '/estudiante' : '/auth/login']);
};
