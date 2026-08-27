import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiResponse } from '../services/common.service';
import { DeliveryService } from '../services/delivery/delivery.service';

/** Thin pass-through, so components depend on one thing rather than several. */
@Injectable({ providedIn: 'root' })
export class DeliveryFacadeService {
  constructor(private readonly delivery: DeliveryService) {}

  myProfile(): Observable<ApiResponse> { return this.delivery.myProfile(); }
  saveProfile(form: FormData): Observable<ApiResponse> { return this.delivery.saveProfile(form); }
  myDeliveries(payload: any = {}): Observable<ApiResponse> { return this.delivery.myDeliveries(payload); }
  detail(id: number): Observable<ApiResponse> { return this.delivery.detail(id); }

  respond(id: number, accept: boolean, reason?: string): Observable<ApiResponse> {
    return this.delivery.respond(id, accept, reason);
  }

  advance(payload: any): Observable<ApiResponse> { return this.delivery.advance(payload); }
  verifyRecipient(payload: any): Observable<ApiResponse> { return this.delivery.verifyRecipient(payload); }
  complete(id: number, note?: string): Observable<ApiResponse> { return this.delivery.complete(id, note); }

  updateLocation(latitude: number, longitude: number): Observable<ApiResponse> {
    return this.delivery.updateLocation(latitude, longitude);
  }
}
