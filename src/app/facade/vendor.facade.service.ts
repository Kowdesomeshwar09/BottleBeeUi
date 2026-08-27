import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../services/common.service';
import { VendorService } from '../services/vendor/vendor.service';

/** Thin pass-through, so components depend on one thing rather than several. */
@Injectable({ providedIn: 'root' })
export class VendorFacadeService {
  constructor(private readonly vendor: VendorService) {}

  /* ------------------------------- store ---------------------------- */
  myStores(): Observable<ApiResponse> { return this.vendor.myStores(); }
  apply(payload: any): Observable<ApiResponse> { return this.vendor.apply(payload); }
  update(payload: any): Observable<ApiResponse> { return this.vendor.update(payload); }
  detail(id: number): Observable<ApiResponse> { return this.vendor.detail(id); }

  /* ------------------------------ licences -------------------------- */
  licenses(payload: any = {}): Observable<ApiResponse> { return this.vendor.licenses(payload); }
  addLicense(form: FormData): Observable<ApiResponse> { return this.vendor.addLicense(form); }

  /* ------------------------------ products -------------------------- */
  products(payload: any = {}): Observable<ApiResponse> { return this.vendor.products(payload); }
  productDetail(id: number): Observable<ApiResponse> { return this.vendor.productDetail(id); }
  createProduct(payload: any): Observable<ApiResponse> { return this.vendor.createProduct(payload); }
  updateProduct(payload: any): Observable<ApiResponse> { return this.vendor.updateProduct(payload); }
  submitForApproval(id: number): Observable<ApiResponse> { return this.vendor.submitForApproval(id); }
  deleteProduct(id: number): Observable<ApiResponse> { return this.vendor.deleteProduct(id); }
  createVariant(payload: any): Observable<ApiResponse> { return this.vendor.createVariant(payload); }
  updateVariant(payload: any): Observable<ApiResponse> { return this.vendor.updateVariant(payload); }
  deleteVariant(id: number): Observable<ApiResponse> { return this.vendor.deleteVariant(id); }
  addImages(form: FormData): Observable<ApiResponse> { return this.vendor.addImages(form); }

  /* ----------------------------- inventory -------------------------- */
  inventory(payload: any = {}): Observable<ApiResponse> { return this.vendor.inventory(payload); }
  inventorySummary(payload: any = {}): Observable<ApiResponse> { return this.vendor.inventorySummary(payload); }
  lowStock(payload: any = {}): Observable<ApiResponse> { return this.vendor.lowStock(payload); }
  adjustStock(payload: any): Observable<ApiResponse> { return this.vendor.adjustStock(payload); }
  stockMovements(payload: any): Observable<ApiResponse> { return this.vendor.stockMovements(payload); }

  /* ------------------------------- orders --------------------------- */
  orders(payload: any = {}): Observable<ApiResponse> { return this.vendor.orders(payload); }
  orderDetail(id: number): Observable<ApiResponse> { return this.vendor.orderDetail(id); }
  updateOrderStatus(payload: any): Observable<ApiResponse> { return this.vendor.updateOrderStatus(payload); }
  orderSummary(payload: any = {}): Observable<ApiResponse> { return this.vendor.orderSummary(payload); }

  /* -------------------------------- staff --------------------------- */
  staff(payload: any = {}): Observable<ApiResponse> { return this.vendor.staff(payload); }
  addStaff(payload: any): Observable<ApiResponse> { return this.vendor.addStaff(payload); }
  removeStaff(id: number): Observable<ApiResponse> { return this.vendor.removeStaff(id); }
}
