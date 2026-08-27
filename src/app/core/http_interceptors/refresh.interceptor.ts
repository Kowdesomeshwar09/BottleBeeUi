import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { AuthenticateService } from '../../services/authenticate.service';
import { AppSettingsService } from '../../config/config-service';
import { AppConfig } from '../../config/app-config';

/**
 * Recovers from an expired access token by rotating the refresh token once and
 * replaying the failed request.
 *
 * Access tokens are short-lived by design, so this fires routinely. Two details
 * matter:
 *
 * 1. Only one refresh runs at a time. A dashboard firing six parallel calls
 *    would otherwise attempt six rotations, and since the API treats a reused
 *    refresh token as theft, five of them would be replays — logging the user
 *    out for doing nothing wrong. Concurrent 401s queue behind the first
 *    refresh instead.
 *
 * 2. A failed refresh signs the user out rather than retrying. If rotation
 *    fails, the session is genuinely finished.
 */
let refreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthenticateService);
  const settings = inject(AppSettingsService);

  const isRefreshCall = req.url.includes(AppConfig.refreshToken);
  const isLoginCall = req.url.includes(AppConfig.login);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only an expired-token 401 is recoverable. A 403 is a permission
      // decision, and a 401 on login is simply wrong credentials.
      if (error.status !== 401 || isRefreshCall || isLoginCall) {
        return throwError(() => error);
      }

      if (!auth.getRefreshToken()) {
        auth.logoutAndRedirect();
        return throwError(() => error);
      }

      if (refreshing) {
        // Wait for the in-flight rotation, then replay with the new token.
        return refreshedToken$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) => next(withToken(req, token))),
        );
      }

      refreshing = true;
      refreshedToken$.next(null);

      const base = settings.getSettings().apiEndPoint || '';

      return fromFetchRefresh(base, auth).pipe(
        switchMap((accessToken) => {
          refreshing = false;
          refreshedToken$.next(accessToken);
          return next(withToken(req, accessToken));
        }),
        catchError((refreshError) => {
          refreshing = false;
          auth.logoutAndRedirect();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Rotates the refresh token using `fetch` rather than HttpClient, so the call
 * cannot re-enter this interceptor and recurse.
 */
function fromFetchRefresh(base: string, auth: AuthenticateService): Observable<string> {
  return new Observable<string>((subscriber) => {
    fetch(`${base}${AppConfig.refreshToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.getRefreshToken() }),
    })
      .then((res) => res.json())
      .then((body) => {
        if (!body?.success || !body?.data?.tokens?.accessToken) {
          throw new Error(body?.message || 'Session refresh failed');
        }

        auth.updateTokens(body.data.tokens);
        subscriber.next(body.data.tokens.accessToken);
        subscriber.complete();
      })
      .catch((err) => subscriber.error(err));
  });
}
