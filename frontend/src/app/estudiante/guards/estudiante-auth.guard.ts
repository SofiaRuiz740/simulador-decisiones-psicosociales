import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { EstudianteSessionService } from '../../core/services/estudiante-session.service';

export const estudianteAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const session = inject(EstudianteSessionService);
  const router = inject(Router);

  if (session.autenticado() && !auth.isAuthenticated()) {
    auth.clearLocalSession();
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
