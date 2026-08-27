import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminFacadeService } from '../../facade/admin.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { AssetUrlPipe } from '../../shared/asset-url.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';
import { Product } from '../../shared/models/catalog.model';

const FILTERS = [
  { label: 'Awaiting approval', value: 'PENDING_APPROVAL' },
  { label: 'All', value: null },
  { label: 'Live', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Inactive', value: 'INACTIVE' },
];

/**
 * Product approvals.
 *
 * The reviewer is checking two different things: that the listing is honest —
 * name, type and ABV describe what is in the bottle — and that the store behind
 * it is entitled to sell. The second is already enforced at checkout, so this
 * screen concentrates on the first, and shows the ABV and type prominently
 * because a mislabelled strength is the mistake that matters.
 */
@Component({
  selector: 'bb-admin-products',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    StateBlock,
    MoneyPipe,
    AssetUrlPipe,
  ],
  templateUrl: './admin-products.html',
  styleUrls: ['./admin-products.scss', '../../shared/table-page.scss'],
})
export class AdminProducts {
  private readonly admin = inject(AdminFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly filters = FILTERS;

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly detailOpen = signal(false);
  readonly detail = signal<Product | null>(null);

  readonly decisionOpen = signal(false);
  readonly deciding = signal(false);
  decisionTarget: Product | null = null;
  decisionStatus = 'ACTIVE';
  decisionReason = '';
  isFeatured = false;

  search = '';
  filter: string | null = 'PENDING_APPROVAL';
  rows = 25;
  first = 0;

  private readonly searchInput = new Subject<string>();

  constructor() {
    this.searchInput.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.first = 0;
      this.load();
    });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: Math.floor(this.first / this.rows) + 1,
      limit: this.rows,
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    };
    if (this.search.trim()) payload['search'] = this.search.trim();
    if (this.filter) payload['status'] = this.filter;

    this.admin.products(payload).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.products.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load the products.'));
      },
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

  openDetail(product: Product): void {
    this.detail.set(product);
    this.detailOpen.set(true);
  }

  askDecision(product: Product, status: string): void {
    this.decisionTarget = product;
    this.decisionStatus = status;
    this.decisionReason = '';
    this.isFeatured = !!product.isFeatured;
    this.decisionOpen.set(true);
  }

  confirmDecision(): void {
    const product = this.decisionTarget;
    if (!product) return;
    if (this.decisionStatus === 'REJECTED' && this.decisionReason.trim().length < 3) return;

    const payload: Record<string, unknown> = {
      id: product.id,
      status: this.decisionStatus,
    };
    if (this.decisionReason.trim()) payload['rejectionReason'] = this.decisionReason.trim();
    if (this.decisionStatus === 'ACTIVE') payload['isFeatured'] = this.isFeatured;

    this.deciding.set(true);
    this.admin.reviewProduct(payload as any).subscribe({
      next: () => {
        this.deciding.set(false);
        this.decisionOpen.set(false);
        this.detailOpen.set(false);
        this.toast.add({
          severity: 'success',
          summary:
            this.decisionStatus === 'ACTIVE'
              ? `${product.name} is live`
              : `${product.name} rejected`,
          life: 4000,
        });
        this.load();
      },
      error: (err) => {
        this.deciding.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not record that decision',
          detail: CommonService.errorMessage(err),
          life: 8000,
        });
      },
    });
  }

  priceRange(product: Product): string {
    const variants = product.variants || [];
    if (!variants.length) return '—';

    const prices = variants.map((v) => v.sellingPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `${min}` : `${min}–${max}`;
  }

  /** Flags an ABV that looks wrong for the declared type. */
  abvLooksOdd(product: Product): boolean {
    const abv = product.alcoholPercentage;
    if (abv === null || abv === undefined) return false;

    const expected: Record<string, [number, number]> = {
      BEER: [0, 12],
      WINE: [5, 22],
      CHAMPAGNE: [8, 15],
      WHISKEY: [30, 70],
      VODKA: [30, 60],
      GIN: [30, 60],
      RUM: [30, 75],
      TEQUILA: [30, 60],
      BRANDY: [30, 60],
      LIQUEUR: [10, 55],
    };

    const range = expected[product.productType];
    if (!range) return false;
    return abv < range[0] || abv > range[1];
  }
}
