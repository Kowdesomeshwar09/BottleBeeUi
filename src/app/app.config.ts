import {
  ApplicationConfig,
  Injector,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { PreInitService, preInitServiceFactory } from './config/config-service';
import { tokenInterceptor } from './core/http_interceptors/token.interceptor';
import { refreshInterceptor } from './core/http_interceptors/refresh.interceptor';

/**
 * Bottle Bee's palette: honey amber over Aura's neutrals.
 *
 * Defined as a preset rather than as loose CSS so every PrimeNG component picks
 * the brand colour up on its own — buttons, tags, focus rings and the rest stay
 * consistent without a stylesheet chasing each one.
 */
const BottleBeeTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{amber.50}',
      100: '{amber.100}',
      200: '{amber.200}',
      300: '{amber.300}',
      400: '{amber.400}',
      500: '{amber.500}',
      600: '{amber.600}',
      700: '{amber.700}',
      800: '{amber.800}',
      900: '{amber.900}',
      950: '{amber.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{amber.600}',
          contrastColor: '#1c1917',
          hoverColor: '{amber.700}',
          activeColor: '{amber.800}',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    provideRouter(
      routes,
      withComponentInputBinding(),
      // A product list that keeps its scroll position after a back-navigation,
      // and an anchor link that actually lands on its heading.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    // Order matters: the token interceptor attaches the access token, and the
    // refresh interceptor sits behind it to catch the 401 that token produced.
    provideHttpClient(withInterceptors([tokenInterceptor, refreshInterceptor])),

    providePrimeNG({
      theme: {
        preset: BottleBeeTheme,
        options: {
          darkModeSelector: '.bb-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: true,
    }),

    MessageService,
    ConfirmationService,

    // Runtime config resolves before the first route renders, so no service ever
    // has to guess the API origin.
    provideAppInitializer(() => {
      const init = preInitServiceFactory(inject(PreInitService), inject(Injector));
      return init();
    }),
  ],
};
