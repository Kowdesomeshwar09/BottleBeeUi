import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminFacadeService } from '../../facade/admin.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';
import { Order } from '../../shared/models/order.model';

const FILTERS = [
  { label: 'Needs a rider', value: 'READY_FOR_PICKUP' },
  { label: 'All', value: null },
  { label: 'Awaiting payment', value: 'PAYMENT_PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'In transit', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

/**
 * Every order on the platform, and the dispatch decision.
 *
 * Assigning a rider is an admin action rather than a store one: a delivery
 * partner works across stores, and only the platform can see who is free. The
 * API refuses to assign a partner who is not ACTIVE, so the picker only offers
 * ones that can actually be given work.
 */
@Component({
  selector: 'bb-admin-orders',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss', '../../shared/table-page.scss'],
})
export class AdminOrders {
  private readonly admin = inject(AdminFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly filters = FILTERS;

  readonly orders = signal<Order[]>([]);
  readonly partners = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly detail = signal<Order | null>(null);
  readonly detailOpen = signal(false);
  readonly loadingDetail = signal(false);

  readonly assignOpen = signal(false);
  readonly assigning = signal(false);
  assignTarget: Order | null = null;
  selectedPartnerId: number | null = null;

  search = '';
  filter: string | null = 'READY_FOR_PICKUP';
  rows = 25;
  first = 0;

  private readonly searchInput = new Subject<string>();

  /** Only ACTIVE partners can be given work; the API enforces the same rule. */
  readonly assignablePartners = computed(() =>
    this.partners()
      .filter((p) => p.status === 'ACTIVE')
      .map((p) => ({
        label: [
          p.user?.name || `Partner ${p.id}`,
          humanise(p.vehicleType),
          p.vehicleNumber,
        ]
          .filter(Boolean)
          .join(' · '),
        value: p.id,
      })),
  );

  constructor() {
    this.searchInput.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.first = 0;
      this.load();
    });

    this.load();
    this.loadPartners();
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
    if (this.search.trim()) payload['search'] = this.search.trim();
    if (this.filter) payload['status'] = this.filter;

    this.admin.orders(payload).subscribe({
      next: (res) => {
        this.orders.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.orders.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load the orders.'));
      },
    });
  }

  private loadPartners(): void {
    this.admin.deliveryPartners({ limit: 100 }).subscribe({
      next: (res) => this.partners.set(res.data || []),
      // An empty picker is handled in the template; the table still works.
      error: () => this.partners.set([]),
    });
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchInput.next(value);
  }

  onFilter(): void {
    this.first = 0;
    this.load();
  }

  onPage(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 25;
    this.load();
  }

  openDetail(order: Order): void {
    this.detail.set(null);
    this.detailOpen.set(true);
    this.loadingDetail.set(true);

    this.admin.orderDetail(order.id).subscribe({
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

  /** A rider can only be sent to an order the store has finished packing. */
  needsRider(order: Order): boolean {
    return order.status === 'READY_FOR_PICKUP' && order.deliveryStatus === 'PENDING';
  }

  askAssign(order: Order): void {
    this.assignTarget = order;
    this.selectedPartnerId = null;
    this.assignOpen.set(true);
  }

  confirmAssign(): void {
    const order = this.assignTarget;
    if (!order || !this.selectedPartnerId) return;

    this.assigning.set(true);
    this.admin.assignDelivery(order.id, this.selectedPartnerId).subscribe({
      next: () => {
        this.assigning.set(false);
        this.assignOpen.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Rider assigned',
          detail: `${order.orderNumber} has been offered to a delivery partner.`,
          life: 4000,
        });
        this.load();
      },
      error: (err) => {
        this.assigning.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not assign that rider',
          detail: CommonService.errorMessage(err),
          life: 8000,
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
