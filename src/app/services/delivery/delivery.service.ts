import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppConfig } from '../../config/app-config';
import { ApiResponse, CommonService } from '../common.service';

/** The delivery partner's surface. */
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  constructor(private readonly api: CommonService) {}

  myProfile(): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryMyProfile, {});
  }

  /** Multipart: the scanned driving licence travels as a file. */
  saveProfile(form: FormData): Observable<ApiResponse> {
    return this.api.postForm(AppConfig.deliverySaveProfile, form);
  }

  myDeliveries(payload: any = {}): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryList, payload);
  }

  detail(id: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryDetail, { id });
  }

  respond(id: number, accept: boolean, reason?: string): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryRespond, { id, accept, reason });
  }

  /** PICKED_UP, IN_TRANSIT or FAILED. Completion has its own endpoint. */
  advance(payload: { id: number; status: string; note?: string; reason?: string }): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryAdvance, payload);
  }

  /**
   * The legal handoff check. Recorded separately from completion so that
   * "I checked their ID" is its own audited statement, and `documentType`
   * records what was actually checked.
   */
  verifyRecipient(payload: {
    id: number;
    verified: boolean;
    documentType?: string;
    notes?: string;
  }): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryVerifyRecipient, payload);
  }

  /** Refused by the API until the recipient has been verified. */
  complete(id: number, note?: string): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryComplete, { id, note });
  }

  updateLocation(latitude: number, longitude: number): Observable<ApiResponse> {
    return this.api.post(AppConfig.deliveryUpdateLocation, { latitude, longitude });
  }
}
