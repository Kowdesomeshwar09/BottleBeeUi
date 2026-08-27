import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppConfig } from '../config/app-config';
import { ApiResponse, CommonService } from './common.service';
import { AuthenticateService } from './authenticate.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly api: CommonService,
    private readonly session: AuthenticateService,
  ) {}

  /** Signs in and stores the session as a side effect. */
  login(payload: { email: string; password: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.login, payload).pipe(
      tap((res) => {
        if (res.success) this.session.setSession(res.data.tokens, res.data.user);
      }),
    );
  }

  register(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.register, payload).pipe(
      tap((res) => {
        if (res.success) this.session.setSession(res.data.tokens, res.data.user);
      }),
    );
  }

  /**
   * Clears the local session whether or not the server call succeeds — a failed
   * logout must not leave the user apparently signed in.
   */
  logout(): Observable<ApiResponse> {
    const refreshToken = this.session.getRefreshToken();
    return this.api.post(AppConfig.logout, { refreshToken }).pipe(
      tap({
        next: () => this.session.clear(),
        error: () => this.session.clear(),
      }),
    );
  }

  me(): Observable<ApiResponse> {
    return this.api.post(AppConfig.me, {});
  }

  sessions(): Observable<ApiResponse> {
    return this.api.post(AppConfig.sessions, {});
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.api.post(AppConfig.forgotPassword, { email });
  }

  resetPassword(payload: { token: string; password: string; confirmPassword: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.resetPassword, payload);
  }

  changePassword(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.changePassword, payload);
  }
}
