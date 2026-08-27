import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../services/common.service';
import { CatalogService } from '../services/shop/catalog.service';
import { CartService } from '../services/shop/cart.service';
import { OrderService } from '../services/shop/order.service';
import { CustomerService } from '../services/shop/customer.service';

/**
 * The storefront facade.
 *
 * Components inject this rather than the four services beneath it, so a screen
 * that shows a product, its stock and the customer's cart has one dependency
 * instead of three, and a change in how those calls are composed does not ripple
 * through every component that uses them.
 */
@Injectable({ providedIn: 'root' })
export class ShopFacadeService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly cartService: CartService,
    private readonly orders: OrderService,
    private readonly customer: CustomerService,
  ) {}

  /* -------------------------------- catalog ------------------------------- */

  listProducts(payload: any): Observable<ApiResponse> {
    return this.catalog.listProducts(payload);
  }

  productDetail(payload: any): Observable<ApiResponse> {
    return this.catalog.productDetail(payload);
  }

  filters(): Observable<ApiResponse> {
    return this.catalog.filters();
  }

  categoryTree(): Observable<ApiResponse> {
    return this.catalog.categoryTree();
  }

  storeDetail(id: number): Observable<ApiResponse> {
    return this.catalog.storeDetail(id);
  }

  activePromotions(): Observable<ApiResponse> {
    return this.catalog.activePromotions();
  }

  productReviews(payload: any): Observable<ApiResponse> {
    return this.catalog.productReviews(payload);
  }

  serviceability(payload: any): Observable<ApiResponse> {
    return this.catalog.serviceability(payload);
  }

  /* --------------------------------- cart --------------------------------- */

  /** Live cart, for a header badge. */
  get cart$() {
    return this.cartService.cart$;
  }

  get itemCount$() {
    return this.cartService.itemCount$;
  }

  get cartSnapshot() {
    return this.cartService.snapshot;
  }

  loadCart(): Observable<ApiResponse> {
    return this.cartService.detail();
  }

  addToCart(productVariantId: number, quantity = 1): Observable<ApiResponse> {
    return this.cartService.addItem(productVariantId, quantity);
  }

  updateCartItem(id: number, quantity: number): Observable<ApiResponse> {
    return this.cartService.updateItem(id, quantity);
  }

  removeCartItem(id: number): Observable<ApiResponse> {
    return this.cartService.removeItem(id);
  }

  clearCart(): Observable<ApiResponse> {
    return this.cartService.clear();
  }

  applyCoupon(code: string): Observable<ApiResponse> {
    return this.cartService.applyCoupon(code);
  }

  removeCoupon(): Observable<ApiResponse> {
    return this.cartService.removeCoupon();
  }

  availableCoupons(subtotal: number, vendorId?: number): Observable<ApiResponse> {
    return this.cartService.availableCoupons(subtotal, vendorId);
  }

  validateCheckout(deliveryAddressId?: number): Observable<ApiResponse> {
    return this.cartService.validateForCheckout(deliveryAddressId);
  }

  resetCart(): void {
    this.cartService.reset();
  }

  /* -------------------------------- orders -------------------------------- */

  checkout(payload: any): Observable<ApiResponse> {
    return this.orders.checkout(payload);
  }

  myOrders(payload: any = {}): Observable<ApiResponse> {
    return this.orders.list(payload);
  }

  orderDetail(id: number): Observable<ApiResponse> {
    return this.orders.detail(id);
  }

  trackOrder(payload: any): Observable<ApiResponse> {
    return this.orders.track(payload);
  }

  cancelOrder(id: number, reason: string): Observable<ApiResponse> {
    return this.orders.cancel(id, reason);
  }

  createPaymentIntent(orderId: number): Observable<ApiResponse> {
    return this.orders.createPaymentIntent(orderId);
  }

  confirmPayment(payload: any): Observable<ApiResponse> {
    return this.orders.confirmPayment(payload);
  }

  requestRefund(payload: any): Observable<ApiResponse> {
    return this.orders.requestRefund(payload);
  }

  submitReview(payload: any): Observable<ApiResponse> {
    return this.orders.submitReview(payload);
  }

  myReviews(payload: any = {}): Observable<ApiResponse> {
    return this.orders.myReviews(payload);
  }

  /* ------------------------------- customer ------------------------------- */

  profile(): Observable<ApiResponse> {
    return this.customer.profile();
  }

  saveProfile(payload: any): Observable<ApiResponse> {
    return this.customer.saveProfile(payload);
  }

  customerOrderSummary(): Observable<ApiResponse> {
    return this.customer.orderSummary();
  }

  addresses(): Observable<ApiResponse> {
    return this.customer.addresses();
  }

  createAddress(payload: any): Observable<ApiResponse> {
    return this.customer.createAddress(payload);
  }

  updateAddress(payload: any): Observable<ApiResponse> {
    return this.customer.updateAddress(payload);
  }

  setDefaultAddress(id: number): Observable<ApiResponse> {
    return this.customer.setDefaultAddress(id);
  }

  deleteAddress(id: number): Observable<ApiResponse> {
    return this.customer.deleteAddress(id);
  }

  eligibility(): Observable<ApiResponse> {
    return this.customer.eligibility();
  }

  ageVerificationStatus(): Observable<ApiResponse> {
    return this.customer.ageVerificationStatus();
  }

  submitAgeVerification(form: FormData): Observable<ApiResponse> {
    return this.customer.submitAgeVerification(form);
  }

  notifications(payload: any = {}): Observable<ApiResponse> {
    return this.customer.notifications(payload);
  }

  unreadCount(): Observable<ApiResponse> {
    return this.customer.unreadCount();
  }

  markAllNotificationsRead(): Observable<ApiResponse> {
    return this.customer.markAllNotificationsRead();
  }
}
