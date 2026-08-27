import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthenticateService } from '../../services/authenticate.service';

/**
 * Attaches the bearer token to outgoing calls.
 *
 * The public endpoints are skipped deliberately. Sending a stale token to
 * `/auth/refresh-token` would have the API reject the request on the expired
 * access token before it ever looked at the refresh token — the one call that
 * exists to recover from exactly that state.
 */
const PUBLIC_PATHS = [
  'auth/login',
  'auth/register',
  'auth/refresh-token',
  'auth/forgot-password',
  'auth/reset-password',
  'catalog/',
  'categories/list',
  'categories/tree',
  'categories/detail',
  'brands/list',
  'brands/detail',
  'promotions/active',
  'compliance/serviceability',
  'reviews/public-list',
  'health/',
];

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthenticateService);

  const isPublic = PUBLIC_PATHS.some((path) => req.url.includes(path));
  const token = auth.getAccessToken();

  // A public endpoint still benefits from a token when one exists — the API
  // personalises some responses — but never requires it.
  if (!token) return next(req);
  if (isPublic && req.url.includes('auth/')) return next(req);

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
