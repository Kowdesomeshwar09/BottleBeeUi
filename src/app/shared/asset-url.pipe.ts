import { Pipe, PipeTransform, inject } from '@angular/core';

import { AppSettingsService } from '../config/config-service';

/**
 * Resolves an API-relative upload path against the API origin.
 *
 * The server stores image paths as `/uploads/products/…` — correct for the API,
 * but the app is served from a different origin in development and may be
 * served from a different host in production. Left alone, the browser resolves
 * `/uploads/…` against the *app* origin and every image 404s.
 *
 * Absolute URLs and data URIs pass through untouched, so a store that supplies
 * an already-hosted image still works.
 */
@Pipe({ name: 'assetUrl' })
export class AssetUrlPipe implements PipeTransform {
  private readonly settings = inject(AppSettingsService);

  transform(path: string | null | undefined): string | null {
    if (!path) return null;

    // Already absolute, or inline — nothing to resolve.
    if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }

    const endpoint = this.settings.getSettings().apiEndPoint;
    if (!endpoint) return path;

    try {
      // `http://host:5000/api/v1/` -> `http://host:5000`
      const origin = new URL(endpoint, window.location.origin).origin;
      return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
    } catch {
      // A malformed apiEndPoint should not break the page; a relative path at
      // least works when the API is served from the same origin.
      return path;
    }
  }
}
