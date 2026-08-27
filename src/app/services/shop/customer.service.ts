import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** Customer profile, address book and age verification. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private readonly api: CommonService) {}

  saveProfile(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.customerProfileSave, payload);
  }

  profile(): Observable<ApiResponse> {
    return this.api.post(AppConfig.customerProfileDetail, {});
  }

  orderSummary(): Observable<ApiResponse> {
    return this.api.post(AppConfig.customerOrderSummary, {});
  }

  /* ------------------------------ addresses ------------------------------ */

  addresses(payload: any = { limit: 50 }): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressList, payload);
  }

  createAddress(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressCreate, payload);
  }

  updateAddress(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressUpdate, payload);
  }

  setDefaultAddress(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressSetDefault, { id });
  }

  deleteAddress(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressDelete, { id });
  }

  /** Can we deliver here right now, and under which regional rules? */
  checkServiceability(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.addressServiceability, { id });
  }

  /* --------------------------- age verification -------------------------- */

  /**
   * Multipart: the document images travel as files. The document number is
   * hashed server-side and never stored in the clear.
   */
  submitAgeVerification(form: FormData): Observable<ApiResponse> {
    return this.api.postForm(AppConfig.ageVerificationSubmit, form);
  }

  ageVerificationStatus(): Observable<ApiResponse> {
    return this.api.post(AppConfig.ageVerificationMyStatus, {});
  }

  /** Every reason the account cannot currently buy, not just the first. */
  eligibility(): Observable<ApiResponse> {
    return this.api.post(AppConfig.ageVerificationEligibility, {});
  }

  /* ----------------------------- notifications --------------------------- */

  notifications(payload: any = { limit: 20 }): Observable<ApiResponse> {
    return this.api.post(AppConfig.notificationList, payload);
  }

  unreadCount(): Observable<ApiResponse> {
    return this.api.post(AppConfig.notificationUnreadCount, {});
  }

  markNotificationRead(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.notificationMarkRead, { id });
  }

  markAllNotificationsRead(): Observable<ApiResponse> {
    return this.api.post(AppConfig.notificationMarkAllRead, {});
  }
}
