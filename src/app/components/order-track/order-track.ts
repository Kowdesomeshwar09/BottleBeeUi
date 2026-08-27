import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TimelineModule } from 'primeng/timeline';

import { ShopFacadeService } from '../../facade/shop.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { ORDER_STATUS_HELP, humanise, toneFor } from '../../shared/status';
import { Order, OrderStatusEvent } from '../../shared/models/order.model';

/** Statuses a customer can still walk away from. The API enforces the real window. */
const CANCELLABLE = ['PLACED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'CONFIRMED', 'PREPARING'];

@Component({
  selector: 'bb-order-track',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    DividerModule,
    InputTextModule,
    MessageModule,
    RatingModule,
    TagModule,
    TextareaModule,
    TimelineModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './order-track.html',
  styleUrl: './order-track.scss',
})
export class OrderTrack {
  private readonly shop = inject(ShopFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly id = input<string>('');

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly statusHelp = ORDER_STATUS_HELP;

  readonly order = signal<Order | null>(null);
  readonly history = signal<OrderStatusEvent[]>([]);
  readonly delivery = signal<any | null>(null);
  readonly payments = signal<any[]>([]);
  readonly refunds = signal<any[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly cancelDialog = signal(false);
  readonly cancelling = signal(false);
  cancelReason = '';

  readonly reviewDialog = signal(false);
  readonly submittingReview = signal(false);
  reviewRating = 5;
  reviewTitle = '';
  reviewComment = '';

  readonly canCancel = computed(() => {
    const order = this.order();
    return !!order && CANCELLABLE.includes(order.status);
  });

  readonly canReview = computed(() => this.order()?.status === 'DELIVERED');

  readonly awaitingPayment = computed(() => {
    const order = this.order();
    return !!order && order.paymentStatus !== 'PAID' && order.status === 'PAYMENT_PENDING';
  });

  constructor() {
    queueMicrotask(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shop.orderDetail(Number(this.id())).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.history.set(res.data?.statusHistory || []);
        this.delivery.set(res.data?.delivery ?? null);
        this.payments.set(res.data?.payments || []);
        this.refunds.set(res.data?.refunds || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load this order.'));
      },
    });
  }

  cancel(): void {
    if (this.cancelReason.trim().length < 3) return;

    this.cancelling.set(true);
    this.shop.cancelOrder(Number(this.id()), this.cancelReason.trim()).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelDialog.set(false);
        this.cancelReason = '';
        this.toast.add({
          severity: 'success',
          summary: 'Order cancelled',
          detail: 'Any payment is refunded to the original method.',
          life: 5000,
        });
        this.load();
      },
      error: (err) => {
        this.cancelling.set(false);
        // The API refuses outside the cancellation window and says why; that
        // reason is the whole message, so it belongs in front of the customer.
        this.toast.add({
          severity: 'error',
          summary: 'Could not cancel',
          detail: CommonService.errorMessage(err),
          life: 9000,
        });
      },
    });
  }

  submitReview(): void {
    const order = this.order();
    if (!order) return;

    this.submittingReview.set(true);
    this.shop
      .submitReview({
        orderId: order.id,
        vendorId: order.vendorId,
        rating: this.reviewRating,
        title: this.reviewTitle.trim() || undefined,
        comment: this.reviewComment.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.reviewDialog.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Thanks for the review',
            detail: 'It will appear once a moderator has looked at it.',
            life: 5000,
          });
        },
        error: (err) => {
          this.submittingReview.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not submit that',
            detail: CommonService.errorMessage(err),
            life: 6000,
          });
        },
      });
  }

  payNow(): void {
    const order = this.order();
    if (!order) return;

    this.shop.createPaymentIntent(order.id).subscribe({
      next: (res) => {
        const intent = res.data;
        if (intent?.publicKey && (window as any).Razorpay) {
          this.toast.add({
            severity: 'info',
            summary: 'Opening payment',
            life: 2500,
          });
          return;
        }

        this.toast.add({
          severity: 'info',
          summary: 'Online payment unavailable here',
          detail:
            'No payment provider is configured in this environment. The order stays reserved ' +
            'until payment is completed.',
          life: 9000,
        });
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Could not start payment',
          detail: CommonService.errorMessage(err),
          life: 6000,
        }),
    });
  }

  backToOrders(): void {
    this.router.navigate(['/orders']);
  }
}
