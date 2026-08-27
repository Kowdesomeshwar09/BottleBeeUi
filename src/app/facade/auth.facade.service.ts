import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../services/common.service';
import { AuthService } from '../services/auth.service';

/** Thin pass-through, so components depend on one thing rather than several. */
@Injectable({ providedIn: 'root' })
export class AuthFacadeService {
  constructor(private readonly auth: AuthService) {}

  login(payload: { email: string; password: string }): Observable<ApiResponse> {
    return this.auth.login(payload);
  }

  register(payload: any): Observable<ApiResponse> {
    return this.auth.register(payload);
  }

  logout(): Observable<ApiResponse> {
    return this.auth.logout();
  }

  me(): Observable<ApiResponse> {
    return this.auth.me();
  }

  sessions(): Observable<ApiResponse> {
    return this.auth.sessions();
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.auth.forgotPassword(email);
  }

  resetPassword(payload: any): Observable<ApiResponse> {
    return this.auth.resetPassword(payload);
  }

  changePassword(payload: any): Observable<ApiResponse> {
    return this.auth.changePassword(payload);
  }
}
