import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** Checkout, orders, payments and refunds. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly api: CommonService) {}

  /** The client sends only an address, a method and a note — never prices. */
  checkout(payload: {
    deliveryAddressId?: number;
    paymentMethod?: string;
    customerNotes?: string;
  }): Observable<ApiResponse> {
    return this.api.post(AppConfig.checkout, payload);
  }

  list(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderList, payload);
  }

  detail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderDetail, { id });
  }

  track(payload: { id?: number; orderNumber?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderTrack, payload);
  }

  statusHistory(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderStatusHistory, payload);
  }

  updateStatus(payload: { id: number; status: string; reason?: string; note?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderUpdateStatus, payload);
  }

  cancel(id: number, reason: string): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderCancel, { id, reason });
  }

  summary(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderSummary, payload);
  }

  /* ------------------------------- payments ------------------------------ */

  createPaymentIntent(orderId: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.paymentCreateIntent, { orderId });
  }

  /** `signature` is the provider's HMAC; the API refuses anything else. */
  confirmPayment(payload: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }): Observable<ApiResponse> {
    return this.api.post(AppConfig.paymentConfirm, payload);
  }

  markPaymentFailed(payload: { providerOrderId: string; reason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.paymentMarkFailed, payload);
  }

  payments(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.paymentList, payload);
  }

  requestRefund(payload: { orderId: number; amount?: number; reason: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.refundRequest, payload);
  }

  refunds(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.refundList, payload);
  }

  reviewRefund(payload: { id: number; status: string; rejectionReason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.refundReview, payload);
  }

  /* ------------------------------- reviews ------------------------------- */

  submitReview(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.reviewSubmit, payload);
  }

  myReviews(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.reviewMyReviews, payload);
  }
}
