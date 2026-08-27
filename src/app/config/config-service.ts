import { Injectable, Injector } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { LOCATION_INITIALIZED } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Runtime configuration, loaded from `assets/config/config.json` before the app
 * bootstraps.
 *
 * Kept out of the compiled bundle deliberately: the same build then runs against
 * development, staging and production by swapping one JSON file, rather than
 * needing a rebuild per environment.
 */
export class AppSettings {
  apiEndPoint?: string;
  appName?: string;
  productVersion?: string;
  /** Publishable payment key. Never the secret — that stays server-side. */
  paymentPublicKey?: string;
  currencySymbol?: string;
  idleTimeoutMinutes?: number;
  supportEmail?: string;
  supportPhone?: string;
}

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly source = new BehaviorSubject<AppSettings>({
    // Safe fallbacks so the app still renders if config.json fails to load.
    apiEndPoint: 'http://localhost:5000/api/v1/',
    appName: 'Bottle Bee',
    currencySymbol: '₹',
    idleTimeoutMinutes: 30,
  });

  readonly settings: Observable<Readonly<AppSettings>> = this.source.asObservable();

  setSettings(settings: Partial<AppSettings>): void {
    this.source.next({ ...this.source.value, ...settings });
  }

  getSettings(): Readonly<AppSettings> {
    return this.source.value;
  }
}

@Injectable({ providedIn: 'root' })
export class PreInitService {
  constructor(
    private readonly httpBackend: HttpBackend,
    private readonly appSettings: AppSettingsService,
  ) {}

  async onInit(): Promise<boolean> {
    // HttpBackend bypasses the interceptors: config must load before there is
    // any token to attach, and an auth redirect here would be nonsense.
    const http = new HttpClient(this.httpBackend);

    try {
      const config = await http
        .get<AppSettings>('./assets/config/config.json')
        .toPromise();

      if (config) this.appSettings.setSettings(config);
      return true;
    } catch {
      // Fall back to the defaults above rather than blocking startup.
      console.warn('[config] assets/config/config.json not loaded — using defaults');
      return true;
    }
  }
}

/** APP_INITIALIZER factory: config is resolved before the first route renders. */
export function preInitServiceFactory(initService: PreInitService, injector: Injector) {
  return () =>
    new Promise<boolean>((resolve) =>
      injector
        .get(LOCATION_INITIALIZED, Promise.resolve(null))
        .then(() => initService.onInit().then(resolve)),
    );
}
