import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { VendorFacadeService } from '../../facade/vendor.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';
import { Order } from '../../shared/models/order.model';

const STATUS_FILTERS = [
  { label: 'Needs attention', value: 'OPEN' },
  { label: 'All', value: null },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready for pickup', value: 'READY_FOR_PICKUP' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

/** What the store itself drives. Everything else belongs to dispatch or the rider. */
const VENDOR_ACTIONS: Record<string, { status: string; label: string; icon: string }> = {
  CONFIRMED: { status: 'PREPARING', label: 'Start packing', icon: 'pi pi-box' },
  PREPARING: { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', icon: 'pi pi-check' },
};

@Component({
  selector: 'bb-vendor-orders',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './vendor-orders.html',
  styleUrls: ['./vendor-orders.scss', '../../shared/table-page.scss'],
})
export class VendorOrders {
  private readonly vendor = inject(VendorFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly statusFilters = STATUS_FILTERS;

  readonly orders = signal<Order[]>([]);
  readonly summary = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly busyId = signal<number | null>(null);

  readonly detail = signal<Order | null>(null);
  readonly detailOpen = signal(false);
  readonly loadingDetail = signal(false);

  readonly cancelOpen = signal(false);
  readonly cancelling = signal(false);
  cancelTarget: Order | null = null;
  cancelReason = '';

  filter: string | null = 'OPEN';
  rows = 20;
  first = 0;

  constructor() {
    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: Math.floor(this.first / this.rows) + 1,
      limit: this.rows,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    // "Needs attention" is several statuses, not one; the API accepts an array.
    if (this.filter === 'OPEN') {
      payload['status'] = ['PLACED', 'PAYMENT_PENDING', 'CONFIRMED', 'PREPARING'];
    } else if (this.filter) {
      payload['status'] = this.filter;
    }

    this.vendor.orders(payload).subscribe({
      next: (res) => {
        this.orders.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.orders.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load your orders.'));
      },
    });
  }

  private loadSummary(): void {
    this.vendor.orderSummary().subscribe({
      next: (res) => this.summary.set(res.data ?? null),
      error: () => this.summary.set(null),
    });
  }

  onPage(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 20;
    this.load();
  }

  onFilter(): void {
    this.first = 0;
    this.load();
  }

  action(order: Order) {
    return VENDOR_ACTIONS[order.status] ?? null;
  }

  advance(order: Order): void {
    const next = this.action(order);
    if (!next) return;

    this.busyId.set(order.id);
    this.vendor.updateOrderStatus({ id: order.id, status: next.status }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.add({
          severity: 'success',
          summary: `${order.orderNumber} → ${humanise(next.status)}`,
          life: 3000,
        });
        this.load();
        this.loadSummary();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.add({
          severity: 'error',
          summary: 'Could not move that order',
          detail: CommonService.errorMessage(err),
          life: 7000,
        });
      },
    });
  }

  openDetail(order: Order): void {
    this.detail.set(null);
    this.detailOpen.set(true);
    this.loadingDetail.set(true);

    this.vendor.orderDetail(order.id).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        this.loadingDetail.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not load that order',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  askCancel(order: Order): void {
    this.cancelTarget = order;
    this.cancelReason = '';
    this.cancelOpen.set(true);
  }

  confirmCancel(): void {
    const order = this.cancelTarget;
    if (!order || this.cancelReason.trim().length < 3) return;

    this.cancelling.set(true);
    this.vendor
      .updateOrderStatus({ id: order.id, status: 'CANCELLED', reason: this.cancelReason.trim() })
      .subscribe({
        next: () => {
          this.cancelling.set(false);
          this.cancelOpen.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Order cancelled',
            detail: 'Stock has been released and the customer notified.',
            life: 5000,
          });
          this.load();
          this.loadSummary();
        },
        error: (err) => {
          this.cancelling.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not cancel that order',
            detail: CommonService.errorMessage(err),
            life: 7000,
          });
        },
      });
  }

  itemSummary(order: Order): string {
    const items = order.items || [];
    if (!items.length) return '—';

    const first = `${items[0].quantity} × ${items[0].productName}`;
    return items.length === 1 ? first : `${first} +${items.length - 1}`;
  }
}
