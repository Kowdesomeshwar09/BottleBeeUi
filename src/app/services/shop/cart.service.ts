import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/**
 * The cart.
 *
 * Every mutation returns the whole recalculated cart, so the local snapshot is
 * replaced wholesale rather than patched. The server is the only thing that
 * computes totals, and a client-side "optimistic" update would be the one place
 * the displayed price could diverge from the price actually charged.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartSubject = new BehaviorSubject<any | null>(null);
  readonly cart$ = this.cartSubject.asObservable();

  private readonly countSubject = new BehaviorSubject<number>(0);
  readonly itemCount$ = this.countSubject.asObservable();

  constructor(private readonly api: CommonService) {}

  private cache(res: ApiResponse) {
    if (res.success && res.data) {
      this.cartSubject.next(res.data);
      this.countSubject.next(res.data.totalQuantity ?? 0);
    }
    return res;
  }

  get snapshot() {
    return this.cartSubject.value;
  }

  detail(): Observable<ApiResponse> {
    return this.api.post(AppConfig.cartDetail, {}).pipe(tap((r) => this.cache(r)));
  }

  addItem(productVariantId: number, quantity = 1): Observable<ApiResponse> {
    return this.api
      .post(AppConfig.cartAddItem, { productVariantId, quantity })
      .pipe(tap((r) => this.cache(r)));
  }

  updateItem(id: number, quantity: number): Observable<ApiResponse> {
    return this.api
      .post(AppConfig.cartUpdateItem, { id, quantity })
      .pipe(tap((r) => this.cache(r)));
  }

  removeItem(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.cartRemoveItem, { id }).pipe(tap((r) => this.cache(r)));
  }

  clear(): Observable<ApiResponse> {
    return this.api.post(AppConfig.cartClear, {}).pipe(tap((r) => this.cache(r)));
  }

  applyCoupon(couponCode: string): Observable<ApiResponse> {
    return this.api
      .post(AppConfig.cartApplyCoupon, { couponCode })
      .pipe(tap((r) => this.cache(r)));
  }

  removeCoupon(): Observable<ApiResponse> {
    return this.api.post(AppConfig.cartRemoveCoupon, {}).pipe(tap((r) => this.cache(r)));
  }

  /** Every blocker at once, so the cart can explain them before payment. */
  validateForCheckout(deliveryAddressId?: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.cartValidateCheckout, { deliveryAddressId });
  }

  availableCoupons(subtotal: number, vendorId?: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.availableCoupons, { subtotal, vendorId });
  }

  /** Called after checkout consumes the cart, and on sign-out. */
  reset(): void {
    this.cartSubject.next(null);
    this.countSubject.next(0);
  }
}
