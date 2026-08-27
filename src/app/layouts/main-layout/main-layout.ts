import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

import { AuthenticateService } from '../../services/authenticate.service';
import { AuthFacadeService } from '../../facade/auth.facade.service';
import { ShopFacadeService } from '../../facade/shop.facade.service';
import { AppSettingsService } from '../../config/config-service';

interface NavLink {
  label: string;
  icon: string;
  route: string;
}

/**
 * The application shell: brand, navigation, cart badge and account menu.
 *
 * Navigation is derived from the signed-in user's roles rather than being a
 * fixed list with `*ngIf` on each item — a rider and an admin see genuinely
 * different applications, and building the list once keeps the desktop bar and
 * the mobile drawer from disagreeing about what exists.
 */
@Component({
  selector: 'bb-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AvatarModule,
    BadgeModule,
    ButtonModule,
    DrawerModule,
    MenuModule,
    TooltipModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthenticateService);
  private readonly authFacade = inject(AuthFacadeService);
  private readonly shop = inject(ShopFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly settings = inject(AppSettingsService);

  readonly user = toSignal(this.auth.user$, { initialValue: this.auth.user });
  readonly cartCount = toSignal(this.shop.itemCount$, { initialValue: 0 });

  readonly drawerOpen = signal(false);
  readonly year = new Date().getFullYear();
  readonly supportEmail = this.settings.getSettings().supportEmail;

  readonly isCustomer = computed(() => {
    const u = this.user();
    return !u || u.roles.includes('CUSTOMER');
  });

  readonly links = computed<NavLink[]>(() => {
    const u = this.user();
    if (!u) return [{ label: 'Shop', icon: 'pi-shopping-bag', route: '/shop' }];

    if (this.auth.hasRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT')) {
      return [
        { label: 'Dashboard', icon: 'pi-chart-bar', route: '/admin/dashboard' },
        { label: 'Orders', icon: 'pi-receipt', route: '/admin/orders' },
        { label: 'Vendors', icon: 'pi-building', route: '/admin/vendors' },
        { label: 'Products', icon: 'pi-box', route: '/admin/products' },
        { label: 'Age checks', icon: 'pi-id-card', route: '/admin/age-verifications' },
      ];
    }

    if (this.auth.hasRole('VENDOR_OWNER', 'VENDOR_MANAGER')) {
      return [
        { label: 'Orders', icon: 'pi-receipt', route: '/vendor/orders' },
        { label: 'Products', icon: 'pi-box', route: '/vendor/products' },
        { label: 'Stock', icon: 'pi-database', route: '/vendor/inventory' },
      ];
    }

    if (this.auth.hasRole('DELIVERY_PARTNER')) {
      return [{ label: 'My runs', icon: 'pi-map', route: '/delivery/my-deliveries' }];
    }

    return [
      { label: 'Shop', icon: 'pi-shopping-bag', route: '/shop' },
      { label: 'Orders', icon: 'pi-receipt', route: '/orders' },
    ];
  });

  readonly accountMenu = computed(() => [
    {
      label: this.auth.displayName || 'Account',
      items: [
        { label: 'Your account', icon: 'pi pi-user', routerLink: '/account' },
        { label: 'Your orders', icon: 'pi pi-receipt', routerLink: '/orders' },
        { separator: true },
        { label: 'Sign out', icon: 'pi pi-sign-out', command: () => this.signOut() },
      ],
    },
  ]);

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return `${(u.firstName || '?')[0]}${(u.lastName || '')[0] || ''}`.toUpperCase();
  });

  go(route: string): void {
    this.drawerOpen.set(false);
    this.router.navigate([route]);
  }

  signOut(): void {
    // Clear locally regardless of what the server says: a failed revoke should
    // not leave someone signed in on a shared device.
    this.authFacade.logout().subscribe({
      next: () => this.finishSignOut(),
      error: () => this.finishSignOut(),
    });
  }

  private finishSignOut(): void {
    this.shop.resetCart();
    this.auth.clear();
    this.toast.add({ severity: 'success', summary: 'Signed out', life: 2500 });
    this.router.navigate(['/login']);
  }
}
