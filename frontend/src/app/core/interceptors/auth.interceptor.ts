import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

/**
 * Añade Bearer token y renueva el access token ante 401 (excepto en rutas públicas).
 */
const PUBLIC_PATHS = [
  '/auth/token/',
  '/auth/token/refresh/',
  '/auth/token/verify/',
  '/auth/registro-docente/',
  '/auth/estudiante-acceso/',
  '/health/',
];

function withBearer(req: Parameters<HttpInterceptorFn>[0], token: string) {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function redirigirTrasSesionInvalida(auth: AuthService, router: Router): void {
  const destino = auth.loginUrlDeRol(auth.rol());
  auth.clearLocalSession();
  router.navigate([destino]);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isPublic = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const token = auth.getAccessToken();
  const outgoing = !isPublic && token ? withBearer(req, token) : req;

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      const canRefresh =
        err.status === 401 &&
        !isPublic &&
        !req.url.includes('/auth/token/refresh/') &&
        !!auth.getRefreshToken();

      if (!canRefresh) {
        return throwError(() => err);
      }

      return auth.refreshAccessToken().pipe(
        switchMap(() => {
          const newToken = auth.getAccessToken();
          if (!newToken) {
            redirigirTrasSesionInvalida(auth, router);
            return throwError(() => err);
          }
          return next(withBearer(req, newToken));
        }),
        catchError(() => {
          redirigirTrasSesionInvalida(auth, router);
          return throwError(() => err);
        }),
      );
    }),
  );
};
