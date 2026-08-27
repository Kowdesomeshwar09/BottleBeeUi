import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** Dashboards, reports, approvals and the audit trail. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly api: CommonService) {}

  /* ------------------------- dashboard and reports ------------------------ */

  dashboard(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.adminDashboard, payload);
  }

  salesReport(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.salesReport, payload);
  }

  /** Licence validity and recipient-verification coverage. */
  complianceReport(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.complianceReport, payload);
  }

  auditLogs(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.auditLogs, payload);
  }

  auditTrail(entityType: string, entityId: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.auditTrail, { entityType, entityId });
  }

  /* -------------------------------- vendors ------------------------------- */

  vendors(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorList, payload);
  }

  vendorDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorDetail, { id });
  }

  /** A store cannot be approved until one of its licences is. */
  reviewVendor(payload: { id: number; status: string; reason?: string; commissionPercent?: number }): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorReview, payload);
  }

  licenses(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.licenseList, payload);
  }

  reviewLicense(payload: { id: number; status: string; rejectionReason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.licenseReview, payload);
  }

  /* ---------------------------- age verification -------------------------- */

  ageVerifications(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.ageVerificationList, payload);
  }

  ageVerificationDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.ageVerificationDetail, { id });
  }

  reviewAgeVerification(payload: { id: number; status: string; rejectionReason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.ageVerificationReview, payload);
  }

  /* -------------------------------- catalog ------------------------------- */

  products(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.productList, payload);
  }

  reviewProduct(payload: { id: number; status: string; rejectionReason?: string; isFeatured?: boolean }): Observable<ApiResponse> {
    return this.api.post(AppConfig.productReview, payload);
  }

  /* -------------------------------- reviews ------------------------------- */

  reviewQueue(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.reviewList, payload);
  }

  moderateReview(payload: { id: number; status: string; moderationNote?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.reviewModerate, payload);
  }

  /* ------------------------------- compliance ----------------------------- */

  complianceRules(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.complianceRuleList, payload);
  }

  saveComplianceRule(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.complianceRuleSave, payload);
  }

  /* --------------------------------- users -------------------------------- */

  users(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.userList, payload);
  }

  userDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.userDetail, { id });
  }

  changeUserStatus(payload: { id: number; accountStatus: string; reason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.userChangeStatus, payload);
  }

  roles(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.roleList, payload);
  }

  permissionMatrix(): Observable<ApiResponse> {
    return this.api.post(AppConfig.permissionMatrix, {});
  }

  /* -------------------------------- delivery ------------------------------ */

  deliveryPartners(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryPartnerList, payload);
  }

  reviewDeliveryPartner(payload: { id: number; status: string; reason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryPartnerReview, payload);
  }

  assignDelivery(orderId: number, deliveryPartnerId: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryAssign, { orderId, deliveryPartnerId });
  }

  deliveries(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryList, payload);
  }

  /* -------------------------------- coupons ------------------------------- */

  coupons(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.couponList, payload);
  }

  createCoupon(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.couponCreate, payload);
  }

  updateCoupon(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.couponUpdate, payload);
  }

  deleteCoupon(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.couponDelete, { id });
  }
}
