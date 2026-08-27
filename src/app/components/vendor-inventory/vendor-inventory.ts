import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { VendorFacadeService } from '../../facade/vendor.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise } from '../../shared/status';

const MOVEMENT_TYPES = [
  { label: 'Received stock', value: 'STOCK_IN', hint: 'Add this many units to the shelf.' },
  { label: 'Removed stock', value: 'STOCK_OUT', hint: 'Take this many units off the shelf.' },
  { label: 'Counted stock', value: 'ADJUSTMENT', hint: 'Set the shelf to this exact count.' },
];

const VIEWS = [
  { label: 'All stock', value: 'ALL' },
  { label: 'Running low', value: 'LOW' },
];

/**
 * Stock.
 *
 * Reserved units are shown separately from available ones because they are not
 * the same thing to a store owner: reserved stock is already promised to an
 * order that has not left yet, and counting it as sellable is how a shop
 * oversells. Every adjustment writes a ledger row server-side, so the numbers
 * can always be explained after the fact.
 */
@Component({
  selector: 'bb-vendor-inventory',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectButtonModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './vendor-inventory.html',
  styleUrls: ['./vendor-inventory.scss', '../../shared/table-page.scss'],
})
export class VendorInventory {
  private readonly vendor = inject(VendorFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly movementTypes = MOVEMENT_TYPES;
  readonly views = VIEWS;

  readonly rowsData = signal<any[]>([]);
  readonly summary = signal<any | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly adjustOpen = signal(false);
  readonly adjusting = signal(false);
  adjustTarget: any | null = null;
  transactionType = 'STOCK_IN';
  quantity = 0;
  reorderLevel: number | null = null;
  notes = '';

  readonly ledgerOpen = signal(false);
  readonly ledgerLoading = signal(false);
  readonly ledger = signal<any[]>([]);
  ledgerTarget: any | null = null;

  search = '';
  view = 'ALL';
  rows = 25;
  first = 0;

  private readonly searchInput = new Subject<string>();

  constructor() {
    this.searchInput.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.first = 0;
      this.load();
    });

    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: Math.floor(this.first / this.rows) + 1,
      limit: this.rows,
    };
    if (this.search.trim()) payload['search'] = this.search.trim();

    const request = this.view === 'LOW'
      ? this.vendor.lowStock(payload)
      : this.vendor.inventory(payload);

    request.subscribe({
      next: (res) => {
        this.rowsData.set(res.data || []);
        this.total.set(res.pagination?.total ?? (res.data || []).length);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rowsData.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load your stock.'));
      },
    });
  }

  private loadSummary(): void {
    this.vendor.inventorySummary().subscribe({
      next: (res) => this.summary.set(res.data ?? null),
      error: () => this.summary.set(null),
    });
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchInput.next(value);
  }

  onView(): void {
    this.first = 0;
    this.load();
  }

  onPage(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 25;
    this.load();
  }

  /* -------------------------------- adjust -------------------------------- */

  openAdjust(row: any): void {
    this.adjustTarget = row;
    this.transactionType = 'STOCK_IN';
    this.quantity = 0;
    this.reorderLevel = row.reorderLevel ?? null;
    this.notes = '';
    this.adjustOpen.set(true);
  }

  get adjustHint(): string {
    return MOVEMENT_TYPES.find((t) => t.value === this.transactionType)?.hint ?? '';
  }

  /** What the shelf will read after this movement, so there is no guessing. */
  get projected(): number | null {
    const row = this.adjustTarget;
    if (!row) return null;

    const current = row.quantityAvailable ?? 0;
    if (this.transactionType === 'ADJUSTMENT') return this.quantity;
    if (this.transactionType === 'STOCK_IN') return current + this.quantity;
    return Math.max(0, current - this.quantity);
  }

  applyAdjust(): void {
    const row = this.adjustTarget;
    if (!row) return;

    this.adjusting.set(true);
    this.vendor
      .adjustStock({
        id: row.id,
        transactionType: this.transactionType,
        quantity: this.quantity,
        reorderLevel: this.reorderLevel ?? undefined,
        notes: this.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.adjusting.set(false);
          this.adjustOpen.set(false);
          this.toast.add({ severity: 'success', summary: 'Stock updated', life: 3000 });
          this.load();
          this.loadSummary();
        },
        error: (err) => {
          this.adjusting.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not update that stock',
            detail: CommonService.errorMessage(err),
            life: 7000,
          });
        },
      });
  }

  /* -------------------------------- ledger -------------------------------- */

  openLedger(row: any): void {
    this.ledgerTarget = row;
    this.ledger.set([]);
    this.ledgerOpen.set(true);
    this.ledgerLoading.set(true);

    this.vendor.stockMovements({ id: row.id, limit: 50 }).subscribe({
      next: (res) => {
        this.ledger.set(res.data || []);
        this.ledgerLoading.set(false);
      },
      error: (err) => {
        this.ledgerLoading.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not load the movements',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }
}
