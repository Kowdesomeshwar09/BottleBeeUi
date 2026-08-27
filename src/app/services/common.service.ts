import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AppSettingsService } from '../config/config-service';

/** The envelope every Bottle Bee endpoint returns. */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ field?: string; message?: string; code?: string; [k: string]: any }>;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  [k: string]: any;
}

/**
 * The single HTTP wrapper every service goes through.
 *
 * Two conventions of the API are encoded here so no caller has to remember them:
 * every endpoint is a POST, and every input travels in the body. The
 * corresponding GET helper exists only for the few probe routes that offer one.
 *
 * Errors are re-thrown rather than swallowed. A component needs to know a call
 * failed — silently resolving with an empty result is how a broken screen ends
 * up looking merely empty.
 */
@Injectable({ providedIn: 'root' })
export class CommonService {
  constructor(
    private readonly http: HttpClient,
    private readonly configService: AppSettingsService,
  ) {}

  /** Prefixes a registry path with the configured API origin. */
  url(path: string): string {
    const base = this.configService.getSettings().apiEndPoint || '';
    return `${base}${path}`;
  }

  /** The standard call: POST with a JSON body. */
  post<T = any>(path: string, body: any = {}): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.url(path), body).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  /** POST returning only `data`, for callers that do not need the envelope. */
  postData<T = any>(path: string, body: any = {}): Observable<T> {
    return this.post<T>(path, body).pipe(map((res) => res.data));
  }

  /** Multipart POST. The browser sets the boundary, so no Content-Type here. */
  postForm<T = any>(path: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.url(path), formData).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  /** Only for the health probes, which also answer to GET. */
  get<T = any>(path: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.url(path)).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  /**
   * Pulls a human-readable message out of any failure shape.
   *
   * The API returns `{ message, errors[] }`, but a network drop or a proxy
   * error produces neither, and a component still has to say something useful.
   */
  static errorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
    const body = err?.error;

    if (body?.errors?.length) {
      const first = body.errors[0];
      if (first?.message) return first.message;
    }

    if (body?.message) return body.message;
    if (err?.status === 0) return 'Cannot reach the server. Check your connection.';
    if (err?.message) return err.message;

    return fallback;
  }
}
