import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

import { ShopFacadeService } from '../../../facade/shop.facade.service';
import { CommonService } from '../../../services/common.service';
import { StateBlock } from '../../../shared/components/state-block';
import { MoneyPipe } from '../../../shared/money.pipe';
import { AvailableCoupon, Cart, CartItem } from '../../../shared/models/cart.model';

@Component({
  selector: 'bb-cart',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DividerModule,
    InputTextModule,
    MessageModule,
    TagModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class CartPage {
  private readonly shop = inject(ShopFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly cart = signal<Cart | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyItemId = signal<number | null>(null);
  readonly couponBusy = signal(false);
  readonly coupons = signal<AvailableCoupon[]>([]);

  couponCode = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shop.loadCart().subscribe({
      next: (res) => {
        this.cart.set(res.data);
        this.loading.set(false);
        this.loadCoupons();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load your cart.'));
      },
    });
  }

  private loadCoupons(): void {
    const cart = this.cart();
    if (!cart || !cart.items.length) {
      this.coupons.set([]);
      return;
    }

    this.shop.availableCoupons(cart.subtotal, cart.vendorId ?? undefined).subscribe({
      next: (res) => this.coupons.set(res.data || []),
      // Offers are a nicety; the cart is still usable without them.
      error: () => this.coupons.set([]),
    });
  }

  private applyResponse(res: any): void {
    this.cart.set(res.data);
    this.loadCoupons();
  }

  changeQuantity(item: CartItem, delta: number): void {
    const next = item.quantity + delta;
    if (next < 1) {
      this.remove(item);
      return;
    }

    this.busyItemId.set(item.id);
    this.shop.updateCartItem(item.id, next).subscribe({
      next: (res) => {
        this.busyItemId.set(null);
        this.applyResponse(res);
      },
      error: (err) => {
        this.busyItemId.set(null);
        this.toast.add({
          severity: 'error',
          summary: 'Could not update that',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  remove(item: CartItem): void {
    this.busyItemId.set(item.id);
    this.shop.removeCartItem(item.id).subscribe({
      next: (res) => {
        this.busyItemId.set(null);
        this.applyResponse(res);
      },
      error: (err) => {
        this.busyItemId.set(null);
        this.toast.add({
          severity: 'error',
          summary: 'Could not remove that',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  clear(event: Event): void {
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: 'Remove everything from your cart?',
      header: 'Empty cart',
      icon: 'pi pi-trash',
      acceptLabel: 'Empty it',
      rejectLabel: 'Keep it',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.shop.clearCart().subscribe({
          next: (res) => this.applyResponse(res),
          error: (err) =>
            this.toast.add({
              severity: 'error',
              summary: 'Could not empty the cart',
              detail: CommonService.errorMessage(err),
              life: 6000,
            }),
        });
      },
    });
  }

  applyCoupon(code?: string): void {
    const value = (code ?? this.couponCode).trim();
    if (!value) return;

    this.couponBusy.set(true);
    this.shop.applyCoupon(value).subscribe({
      next: (res) => {
        this.couponBusy.set(false);
        this.applyResponse(res);
        this.couponCode = '';

        // The API applies what it can and reports what it could not; a coupon
        // that silently fails to discount anything is worse than being told.
        if (res.data?.couponError) {
          this.toast.add({
            severity: 'warn',
            summary: 'Coupon not applied',
            detail: res.data.couponError,
            life: 6000,
          });
        } else {
          this.toast.add({ severity: 'success', summary: 'Coupon applied', life: 2500 });
        }
      },
      error: (err) => {
        this.couponBusy.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Coupon not applied',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  removeCoupon(): void {
    this.couponBusy.set(true);
    this.shop.removeCoupon().subscribe({
      next: (res) => {
        this.couponBusy.set(false);
        this.applyResponse(res);
      },
      error: (err) => {
        this.couponBusy.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not remove the coupon',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  get canCheckout(): boolean {
    const cart = this.cart();
    return !!cart && cart.items.length > 0 && cart.warnings.length === 0;
  }

  toCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
