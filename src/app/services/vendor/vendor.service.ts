import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** The store owner's surface: catalog, stock, orders and licences. */
@Injectable({ providedIn: 'root' })
export class VendorService {
  constructor(private readonly api: CommonService) {}

  /* --------------------------------- store -------------------------------- */

  myStores(): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorMyStores, {});
  }

  apply(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorApply, payload);
  }

  update(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorUpdate, payload);
  }

  detail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorDetail, { id });
  }

  /* -------------------------------- licences ------------------------------ */

  licenses(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.licenseList, payload);
  }

  /** Multipart: the scanned excise licence travels as a file. */
  addLicense(form: FormData): Observable<ApiResponse> {
    return this.api.postForm(AppConfig.licenseAdd, form);
  }

  /* -------------------------------- products ------------------------------ */

  products(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.productList, payload);
  }

  productDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.productDetail, { id });
  }

  createProduct(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.productCreate, payload);
  }

  updateProduct(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.productUpdate, payload);
  }

  /** Moves a DRAFT into the admin approval queue. */
  submitForApproval(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.productSubmitForApproval, { id });
  }

  deleteProduct(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.productDelete, { id });
  }

  createVariant(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.variantCreate, payload);
  }

  updateVariant(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.variantUpdate, payload);
  }

  deleteVariant(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.variantDelete, { id });
  }

  addImages(form: FormData): Observable<ApiResponse> {
    return this.api.postForm(AppConfig.productImagesAdd, form);
  }

  /* ------------------------------- inventory ------------------------------ */

  inventory(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.inventoryList, payload);
  }

  inventorySummary(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.inventorySummary, payload);
  }

  lowStock(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.inventoryLowStock, payload);
  }

  /** STOCK_IN and STOCK_OUT are deltas; ADJUSTMENT sets an absolute count. */
  adjustStock(payload: {
    id: number;
    transactionType: string;
    quantity: number;
    reorderLevel?: number;
    notes?: string;
  }): Observable<ApiResponse> {
    return this.api.post(AppConfig.inventoryAdjust, payload);
  }

  stockMovements(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.inventoryTransactions, payload);
  }

  /* --------------------------------- orders ------------------------------- */

  orders(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderList, payload);
  }

  orderDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderDetail, { id });
  }

  updateOrderStatus(payload: { id: number; status: string; reason?: string; note?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderUpdateStatus, payload);
  }

  orderSummary(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.orderSummary, payload);
  }

  /* --------------------------------- staff -------------------------------- */

  staff(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorStaffList, payload);
  }

  addStaff(payload: { email: string; vendorRole: string; vendorId?: number }): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorStaffAdd, payload);
  }

  removeStaff(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.vendorStaffRemove, { id });
  }
}
