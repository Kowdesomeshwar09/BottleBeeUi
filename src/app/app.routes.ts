import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT'];
const VENDOR_ROLES = ['VENDOR_OWNER', 'VENDOR_MANAGER'];
const DELIVERY_ROLES = ['DELIVERY_PARTNER'];

/**
 * Every screen lives in its own folder under `components/`, named for what it
 * is, and is loaded lazily. A delivery rider on a phone should not be
 * downloading the admin console, and a browsing visitor should not be
 * downloading checkout before they have put anything in a cart.
 *
 * Guards decide what the UI offers, not what the API allows — the server
 * re-checks every permission on every request regardless.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Bottle Bee',
    loadComponent: () => import('./components/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create an account · Bottle Bee',
    loadComponent: () => import('./components/register/register').then((m) => m.Register),
  },

  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'shop' },

      /* ------------------------------ storefront ----------------------------- */
      {
        path: 'shop',
        title: 'Shop · Bottle Bee',
        loadComponent: () => import('./components/storefront/storefront').then((m) => m.Storefront),
      },
      {
        path: 'shop/product/:slug',
        title: 'Product · Bottle Bee',
        loadComponent: () =>
          import('./components/product-detail/product-detail').then((m) => m.ProductDetail),
      },

      /* -------------------------------- buying ------------------------------- */
      {
        path: 'cart',
        canActivate: [authGuard],
        title: 'Your cart · Bottle Bee',
        loadComponent: () => import('./components/cart/cart').then((m) => m.CartPage),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        title: 'Checkout · Bottle Bee',
        loadComponent: () => import('./components/checkout/checkout').then((m) => m.Checkout),
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        title: 'Your orders · Bottle Bee',
        loadComponent: () => import('./components/order-list/order-list').then((m) => m.OrderList),
      },
      {
        path: 'orders/:id',
        canActivate: [authGuard],
        title: 'Order · Bottle Bee',
        loadComponent: () => import('./components/order-track/order-track').then((m) => m.OrderTrack),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        title: 'Your account · Bottle Bee',
        loadComponent: () => import('./components/account/account').then((m) => m.Account),
      },

      /* -------------------------------- admin -------------------------------- */
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ROLES },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            title: 'Dashboard · Bottle Bee',
            loadComponent: () =>
              import('./components/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
          },
          {
            path: 'orders',
            title: 'All orders · Bottle Bee',
            loadComponent: () =>
              import('./components/admin-orders/admin-orders').then((m) => m.AdminOrders),
          },
          {
            path: 'vendors',
            title: 'Vendors · Bottle Bee',
            loadComponent: () =>
              import('./components/admin-vendors/admin-vendors').then((m) => m.AdminVendors),
          },
          {
            path: 'products',
            title: 'Product approvals · Bottle Bee',
            loadComponent: () =>
              import('./components/admin-products/admin-products').then((m) => m.AdminProducts),
          },
          {
            path: 'age-verifications',
            title: 'Age verification · Bottle Bee',
            loadComponent: () =>
              import('./components/admin-age-verifications/admin-age-verifications').then(
                (m) => m.AdminAgeVerifications,
              ),
          },
        ],
      },

      /* -------------------------------- vendor ------------------------------- */
      {
        path: 'vendor',
        canActivate: [roleGuard],
        data: { roles: VENDOR_ROLES },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'orders' },
          {
            path: 'orders',
            title: 'Store orders · Bottle Bee',
            loadComponent: () =>
              import('./components/vendor-orders/vendor-orders').then((m) => m.VendorOrders),
          },
          {
            path: 'products',
            title: 'Your products · Bottle Bee',
            loadComponent: () =>
              import('./components/vendor-products/vendor-products').then((m) => m.VendorProducts),
          },
          {
            path: 'inventory',
            title: 'Stock · Bottle Bee',
            loadComponent: () =>
              import('./components/vendor-inventory/vendor-inventory').then((m) => m.VendorInventory),
          },
        ],
      },

      /* ------------------------------- delivery ------------------------------ */
      {
        path: 'delivery',
        canActivate: [roleGuard],
        data: { roles: DELIVERY_ROLES },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'my-deliveries' },
          {
            path: 'my-deliveries',
            title: 'Your runs · Bottle Bee',
            loadComponent: () =>
              import('./components/delivery-list/delivery-list').then((m) => m.DeliveryList),
          },
          {
            path: 'my-deliveries/:id',
            title: 'Delivery · Bottle Bee',
            loadComponent: () =>
              import('./components/delivery-detail/delivery-detail').then((m) => m.DeliveryDetail),
          },
        ],
      },

      /* -------------------------------- errors ------------------------------- */
      {
        path: 'no-access',
        title: 'No access · Bottle Bee',
        loadComponent: () => import('./components/no-access/no-access').then((m) => m.NoAccess),
      },
      {
        path: '**',
        title: 'Not found · Bottle Bee',
        loadComponent: () => import('./components/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
