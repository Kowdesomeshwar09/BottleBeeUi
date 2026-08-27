import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { ShopFacadeService } from '../../facade/shop.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';
import { Order } from '../../shared/models/order.model';

const STATUS_FILTERS = [
  { label: 'All orders', value: null },
  { label: 'Awaiting payment', value: 'PAYMENT_PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'On the way', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

@Component({
  selector: 'bb-order-list',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    PaginatorModule,
    SelectModule,
    TagModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly shop = inject(ShopFacadeService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly statusFilters = STATUS_FILTERS;

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);

  status: string | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: this.page(),
      limit: this.limit(),
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };
    if (this.status) payload['status'] = this.status;

    this.shop.myOrders(payload).subscribe({
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

  onFilter(): void {
    this.page.set(1);
    this.load();
  }

  onPage(event: PaginatorState): void {
    this.page.set((event.page ?? 0) + 1);
    this.limit.set(event.rows ?? 10);
    this.load();
  }

  /** A short line naming what was bought, so the row is recognisable at a glance. */
  itemSummary(order: Order): string {
    const items = order.items || [];
    if (!items.length) return '—';

    const first = `${items[0].quantity} × ${items[0].productName}`;
    return items.length === 1 ? first : `${first} and ${items.length - 1} more`;
  }
}
