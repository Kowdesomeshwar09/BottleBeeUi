import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** The public storefront: browsing, filtering and product detail. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private readonly api: CommonService) {}

  listProducts(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.publicProductList, payload);
  }

  productDetail(payload: { id?: number; slug?: string; vendorId?: number; regionCode?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.publicProductDetail, payload);
  }

  /** Categories, brands, product types, price range and bottle sizes in one call. */
  filters(): Observable<ApiResponse> {
    return this.api.post(AppConfig.catalogFilters, {});
  }

  categoryTree(): Observable<ApiResponse> {
    return this.api.post(AppConfig.categoryTree, {});
  }

  brands(payload: any = { limit: 100 }): Observable<ApiResponse> {
    return this.api.post(AppConfig.brandList, payload);
  }

  storeDetail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.publicStoreDetail, { id });
  }

  activePromotions(): Observable<ApiResponse> {
    return this.api.post(AppConfig.activePromotions, {});
  }

  /** Advisory check shown before checkout; the server re-evaluates at checkout. */
  serviceability(payload: { state?: string; regionCode?: string; postalCode?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.serviceability, payload);
  }

  productReviews(payload: any): Observable<ApiResponse> {
    return this.api.post(AppConfig.reviewPublicList, payload);
  }
}
