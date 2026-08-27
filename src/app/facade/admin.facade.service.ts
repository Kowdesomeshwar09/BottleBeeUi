import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../services/common.service';
import { AdminService } from '../services/admin/admin.service';

/** Thin pass-through, so components depend on one thing rather than several. */
@Injectable({ providedIn: 'root' })
export class AdminFacadeService {
  constructor(private readonly admin: AdminService) {}

  /* --------------------------- dashboards --------------------------- */
  dashboard(payload: any = {}): Observable<ApiResponse> { return this.admin.dashboard(payload); }
  salesReport(payload: any = {}): Observable<ApiResponse> { return this.admin.salesReport(payload); }
  complianceReport(payload: any = {}): Observable<ApiResponse> { return this.admin.complianceReport(payload); }
  auditLogs(payload: any = {}): Observable<ApiResponse> { return this.admin.auditLogs(payload); }
  auditTrail(entityType: string, entityId: number): Observable<ApiResponse> {
    return this.admin.auditTrail(entityType, entityId);
  }

  /* ----------------------------- vendors ---------------------------- */
  vendors(payload: any = {}): Observable<ApiResponse> { return this.admin.vendors(payload); }
  vendorDetail(id: number): Observable<ApiResponse> { return this.admin.vendorDetail(id); }
  reviewVendor(payload: any): Observable<ApiResponse> { return this.admin.reviewVendor(payload); }
  licenses(payload: any = {}): Observable<ApiResponse> { return this.admin.licenses(payload); }
  reviewLicense(payload: any): Observable<ApiResponse> { return this.admin.reviewLicense(payload); }

  /* ------------------------- age verification ----------------------- */
  ageVerifications(payload: any = {}): Observable<ApiResponse> { return this.admin.ageVerifications(payload); }
  ageVerificationDetail(id: number): Observable<ApiResponse> { return this.admin.ageVerificationDetail(id); }
  reviewAgeVerification(payload: any): Observable<ApiResponse> { return this.admin.reviewAgeVerification(payload); }

  /* ----------------------------- catalog ---------------------------- */
  products(payload: any = {}): Observable<ApiResponse> { return this.admin.products(payload); }
  reviewProduct(payload: any): Observable<ApiResponse> { return this.admin.reviewProduct(payload); }

  /* ----------------------------- reviews ---------------------------- */
  reviewQueue(payload: any = {}): Observable<ApiResponse> { return this.admin.reviewQueue(payload); }
  moderateReview(payload: any): Observable<ApiResponse> { return this.admin.moderateReview(payload); }

  /* ---------------------------- compliance -------------------------- */
  complianceRules(payload: any = {}): Observable<ApiResponse> { return this.admin.complianceRules(payload); }
  saveComplianceRule(payload: any): Observable<ApiResponse> { return this.admin.saveComplianceRule(payload); }

  /* ------------------------------ users ----------------------------- */
  users(payload: any = {}): Observable<ApiResponse> { return this.admin.users(payload); }
  userDetail(id: number): Observable<ApiResponse> { return this.admin.userDetail(id); }
  changeUserStatus(payload: any): Observable<ApiResponse> { return this.admin.changeUserStatus(payload); }
  roles(payload: any = {}): Observable<ApiResponse> { return this.admin.roles(payload); }
  permissionMatrix(): Observable<ApiResponse> { return this.admin.permissionMatrix(); }

  /* ------------------------------ orders ---------------------------- */
  orders(payload: any = {}): Observable<ApiResponse> { return this.admin.orders(payload); }
  orderDetail(id: number): Observable<ApiResponse> { return this.admin.orderDetail(id); }
  updateOrderStatus(payload: any): Observable<ApiResponse> { return this.admin.updateOrderStatus(payload); }

  /* ----------------------------- delivery --------------------------- */
  deliveryPartners(payload: any = {}): Observable<ApiResponse> { return this.admin.deliveryPartners(payload); }
  reviewDeliveryPartner(payload: any): Observable<ApiResponse> { return this.admin.reviewDeliveryPartner(payload); }
  assignDelivery(orderId: number, deliveryPartnerId: number): Observable<ApiResponse> {
    return this.admin.assignDelivery(orderId, deliveryPartnerId);
  }
  deliveries(payload: any = {}): Observable<ApiResponse> { return this.admin.deliveries(payload); }

  /* ------------------------------ coupons --------------------------- */
  coupons(payload: any = {}): Observable<ApiResponse> { return this.admin.coupons(payload); }
  createCoupon(payload: any): Observable<ApiResponse> { return this.admin.createCoupon(payload); }
  updateCoupon(payload: any): Observable<ApiResponse> { return this.admin.updateCoupon(payload); }
  deleteCoupon(id: number): Observable<ApiResponse> { return this.admin.deleteCoupon(id); }
}
