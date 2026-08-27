import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';

import { AdminFacadeService } from '../../facade/admin.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';

const WINDOWS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

interface QueueItem {
  key: string;
  label: string;
  count: number;
  route: string | null;
  urgent: boolean;
  note?: string;
}

/**
 * The admin dashboard.
 *
 * Led by what is waiting on a human rather than by totals. On a platform where
 * an unreviewed age verification blocks a customer from ordering and an expiring
 * licence stops a store trading, a queue of pending work is more useful than a
 * revenue figure — so the queue comes first and the numbers come after.
 */
@Component({
  selector: 'bb-admin-dashboard',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    SelectButtonModule,
    TagModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss', '../../shared/table-page.scss'],
})
export class AdminDashboard {
  private readonly admin = inject(AdminFacadeService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly windows = WINDOWS;

  readonly data = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  days = 30;

  readonly queue = computed<QueueItem[]>(() => {
    const q = this.data()?.actionQueue;
    if (!q) return [];

    return [
      {
        key: 'ageVerifications',
        label: 'Age verifications to review',
        count: q.ageVerifications ?? 0,
        route: '/admin/age-verifications',
        urgent: (q.ageVerifications ?? 0) > 0,
        note: 'Each one is a customer who cannot order until it is checked.',
      },
      {
        key: 'vendorApplications',
        label: 'Store applications',
        count: q.vendorApplications ?? 0,
        route: '/admin/vendors',
        urgent: (q.vendorApplications ?? 0) > 0,
      },
      {
        key: 'vendorLicences',
        label: 'Licences to verify',
        count: q.vendorLicences ?? 0,
        route: '/admin/vendors',
        urgent: (q.vendorLicences ?? 0) > 0,
      },
      {
        key: 'expiringLicences',
        label: 'Licences expiring within 30 days',
        count: q.expiringLicences ?? 0,
        route: '/admin/vendors',
        urgent: (q.expiringLicences ?? 0) > 0,
        note: 'A store loses the right to sell the day its licence lapses.',
      },
      {
        key: 'productApprovals',
        label: 'Products awaiting approval',
        count: q.productApprovals ?? 0,
        route: '/admin/products',
        urgent: false,
      },
      {
        key: 'refunds',
        label: 'Open refunds',
        count: q.refunds ?? 0,
        route: null,
        urgent: (q.refunds ?? 0) > 0,
      },
      {
        key: 'reviews',
        label: 'Reviews to moderate',
        count: q.reviews ?? 0,
        route: null,
        urgent: false,
      },
    ].filter((item) => item.count > 0);
  });

  readonly totalWaiting = computed(() =>
    this.queue().reduce((sum, item) => sum + item.count, 0),
  );

  readonly statusRows = computed(() => {
    const byStatus = this.data()?.orders?.byStatus ?? {};
    return Object.entries(byStatus)
      .map(([status, count]) => ({ status, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // The API takes an explicit window, not a day count, and rejects unknown
    // keys — so the selector is translated here rather than sent as-is.
    const to = new Date();
    const from = new Date(to.getTime() - this.days * 24 * 3600 * 1000);

    this.admin
      .dashboard({ fromDate: from.toISOString(), toDate: to.toISOString() })
      .subscribe({
        next: (res) => {
          this.data.set(res.data);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(CommonService.errorMessage(err, 'Could not build the dashboard.'));
        },
      });
  }
}
