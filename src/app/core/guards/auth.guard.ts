import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthenticateService } from '../../services/authenticate.service';

/**
 * Route guards.
 *
 * These decide what the UI shows, not what the API allows — the server re-checks
 * every permission on every request regardless. Their job is to keep a user from
 * landing on a screen that would only fill with permission errors, and to send
 * an unauthenticated visitor to the login page with somewhere to return to.
 */

/** Requires a signed-in user. */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthenticateService);
  const router = inject(Router);

  if (auth.isLoggedIn) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Requires one of the listed roles. Attach via `data: { roles: [...] }`. */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthenticateService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const roles: string[] = route.data?.['roles'] || [];
  if (!roles.length || auth.hasRole(...roles)) return true;

  return router.createUrlTree(['/no-access']);
};

/** Requires one of the listed permissions. Attach via `data: { permissions: [...] }`. */
export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthenticateService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const permissions: string[] = route.data?.['permissions'] || [];
  if (!permissions.length || auth.canAny(...permissions)) return true;

  return router.createUrlTree(['/no-access']);
};

/** Keeps a signed-in user off the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthenticateService);
  const router = inject(Router);

  if (!auth.isLoggedIn) return true;
  return router.createUrlTree([auth.homeRoute()]);
};
