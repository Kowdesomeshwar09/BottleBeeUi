import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

/** What the app keeps about the signed-in user. */
export interface SessionUser {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  accountStatus: string;
  roles: string[];
  permissions: string[];
}

const ACCESS_TOKEN_KEY = 'bb_access_token';
const REFRESH_TOKEN_KEY = 'bb_refresh_token';
const USER_KEY = 'bb_user';

/**
 * Session state: tokens, the current user, and the permission checks the UI
 * uses to decide what to render.
 *
 * Hiding a control the user cannot use is a courtesy, not a security boundary —
 * the server re-checks every permission on every request. These helpers exist so
 * the interface does not offer actions that will simply fail.
 *
 * Tokens live in localStorage so a refresh does not sign the user out. That is
 * readable by any script on the origin, which is the accepted trade-off for a
 * token-based SPA; the mitigations that matter are a short access-token life and
 * refresh rotation with replay detection, both of which the API implements.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticateService {
  private readonly userSubject = new BehaviorSubject<SessionUser | null>(this.readUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(private readonly router: Router) {}

  /* ------------------------------- tokens ------------------------------- */

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setSession(tokens: { accessToken: string; refreshToken: string }, user: SessionUser): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Private browsing can refuse storage; the session then lasts this tab.
    }
    this.userSubject.next(user);
  }

  updateTokens(tokens: { accessToken: string; refreshToken: string }): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch {
      /* ignore */
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    this.userSubject.next(null);
  }

  logoutAndRedirect(): void {
    this.clear();
    this.router.navigate(['/login']);
  }

  /* -------------------------------- user -------------------------------- */

  private readUser(): SessionUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }

  get user(): SessionUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.getAccessToken() && !!this.user;
  }

  get displayName(): string {
    const u = this.user;
    return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
  }

  /* ----------------------------- permissions ---------------------------- */

  /** SUPER_ADMIN bypasses permission checks, matching the server. */
  private get isSuperAdmin(): boolean {
    return this.hasRole('SUPER_ADMIN');
  }

  hasRole(...roles: string[]): boolean {
    const held = this.user?.roles || [];
    return roles.some((r) => held.includes(r));
  }

  can(permission: string): boolean {
    if (!this.user) return false;
    if (this.isSuperAdmin) return true;
    return (this.user.permissions || []).includes(permission);
  }

  canAny(...permissions: string[]): boolean {
    if (!this.user) return false;
    if (this.isSuperAdmin) return true;
    return permissions.some((p) => this.can(p));
  }

  canAll(...permissions: string[]): boolean {
    if (!this.user) return false;
    if (this.isSuperAdmin) return true;
    return permissions.every((p) => this.can(p));
  }

  /** Where a user lands after signing in, based on what they are. */
  homeRoute(): string {
    if (this.hasRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT')) return '/admin/dashboard';
    if (this.hasRole('VENDOR_OWNER', 'VENDOR_MANAGER')) return '/vendor/orders';
    if (this.hasRole('DELIVERY_PARTNER')) return '/delivery/my-deliveries';
    return '/shop';
  }
}
