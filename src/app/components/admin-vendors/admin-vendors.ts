import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { AdminFacadeService } from '../../facade/admin.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { AssetUrlPipe } from '../../shared/asset-url.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';

const VENDOR_FILTERS = [
  { label: 'Awaiting review', value: 'PENDING' },
  { label: 'All', value: null },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

const LICENCE_FILTERS = [
  { label: 'Awaiting review', value: 'PENDING' },
  { label: 'All', value: null },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/**
 * Store approvals and excise licences.
 *
 * The two live on one screen because they are one decision in practice: a store
 * has no business being approved before someone has looked at the licence that
 * entitles it to sell, and the API enforces exactly that — approving a vendor
 * with no approved licence is refused.
 */
@Component({
  selector: 'bb-admin-vendors',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    TableModule,
    TabsModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    StateBlock,
    MoneyPipe,
    AssetUrlPipe,
  ],
  templateUrl: './admin-vendors.html',
  styleUrls: ['./admin-vendors.scss', '../../shared/table-page.scss'],
})
export class AdminVendors {
  private readonly admin = inject(AdminFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly vendorFilters = VENDOR_FILTERS;
  readonly licenceFilters = LICENCE_FILTERS;

  readonly vendors = signal<any[]>([]);
  readonly licences = signal<any[]>([]);
  readonly loading = signal(true);
  readonly loadingLicences = signal(true);
  readonly error = signal<string | null>(null);
  readonly licenceError = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  readonly detail = signal<any | null>(null);
  readonly detailOpen = signal(false);
  readonly loadingDetail = signal(false);

  readonly reviewOpen = signal(false);
  readonly reviewing = signal(false);
  reviewTarget: any | null = null;
  reviewStatus = 'APPROVED';
  reviewReason = '';
  commissionPercent: number | null = 10;

  readonly licenceOpen = signal(false);
  readonly reviewingLicence = signal(false);
  licenceTarget: any | null = null;
  licenceStatus = 'APPROVED';
  licenceReason = '';

  vendorFilter: string | null = 'PENDING';
  licenceFilter: string | null = 'PENDING';

  /** Licences already lapsed, or lapsing within thirty days. */
  readonly expiringLicences = computed(() => {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);

    return this.licences().filter(
      (l) => l.status === 'APPROVED' && l.validUntil && new Date(l.validUntil) <= horizon,
    );
  });

  constructor() {
    this.load();
    this.loadLicences();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = { limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' };
    if (this.vendorFilter) payload['status'] = this.vendorFilter;

    this.admin.vendors(payload).subscribe({
      next: (res) => {
        this.vendors.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.vendors.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load the stores.'));
      },
    });
  }

  loadLicences(): void {
    this.loadingLicences.set(true);
    this.licenceError.set(null);

    const payload: Record<string, unknown> = { limit: 100 };
    if (this.licenceFilter) payload['status'] = this.licenceFilter;

    this.admin.licenses(payload).subscribe({
      next: (res) => {
        this.licences.set(res.data || []);
        this.loadingLicences.set(false);
      },
      error: (err) => {
        this.loadingLicences.set(false);
        this.licences.set([]);
        this.licenceError.set(CommonService.errorMessage(err, 'Could not load the licences.'));
      },
    });
  }

  openDetail(vendor: any): void {
    this.detail.set(null);
    this.detailOpen.set(true);
    this.loadingDetail.set(true);

    this.admin.vendorDetail(vendor.id).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        this.loadingDetail.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not load that store',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  /* ------------------------------ vendor review ---------------------------- */

  askReview(vendor: any, status: string): void {
    this.reviewTarget = vendor;
    this.reviewStatus = status;
    this.reviewReason = '';
    this.commissionPercent = vendor.commissionPercent || 10;
    this.reviewOpen.set(true);
  }

  get reviewNeedsReason(): boolean {
    return this.reviewStatus !== 'APPROVED';
  }

  confirmReview(): void {
    const vendor = this.reviewTarget;
    if (!vendor) return;
    if (this.reviewNeedsReason && this.reviewReason.trim().length < 3) return;

    const payload: Record<string, unknown> = {
      id: vendor.id,
      status: this.reviewStatus,
    };
    if (this.reviewReason.trim()) payload['reason'] = this.reviewReason.trim();
    if (this.reviewStatus === 'APPROVED' && this.commissionPercent !== null) {
      payload['commissionPercent'] = this.commissionPercent;
    }

    this.reviewing.set(true);
    this.admin.reviewVendor(payload as any).subscribe({
      next: () => {
        this.reviewing.set(false);
        this.reviewOpen.set(false);
        this.toast.add({
          severity: 'success',
          summary: `${vendor.businessName} → ${humanise(this.reviewStatus)}`,
          life: 4000,
        });
        this.load();
      },
      error: (err) => {
        this.reviewing.set(false);
        // The API refuses to approve a store with no approved licence. That
        // refusal is the point of the rule, so it goes in front of the reviewer
        // rather than being softened.
        this.toast.add({
          severity: 'error',
          summary: 'Could not record that decision',
          detail: CommonService.errorMessage(err),
          life: 9000,
        });
      },
    });
  }

  /* ----------------------------- licence review ---------------------------- */

  askLicence(licence: any, status: string): void {
    this.licenceTarget = licence;
    this.licenceStatus = status;
    this.licenceReason = '';
    this.licenceOpen.set(true);
  }

  confirmLicence(): void {
    const licence = this.licenceTarget;
    if (!licence) return;
    if (this.licenceStatus === 'REJECTED' && this.licenceReason.trim().length < 3) return;

    this.reviewingLicence.set(true);
    this.admin
      .reviewLicense({
        id: licence.id,
        status: this.licenceStatus,
        rejectionReason: this.licenceReason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.reviewingLicence.set(false);
          this.licenceOpen.set(false);
          this.toast.add({
            severity: 'success',
            summary: `Licence ${humanise(this.licenceStatus).toLowerCase()}`,
            life: 4000,
          });
          this.loadLicences();
          this.load();
        },
        error: (err) => {
          this.reviewingLicence.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not record that decision',
            detail: CommonService.errorMessage(err),
            life: 8000,
          });
        },
      });
  }

  /** Days until a licence lapses; negative once it has. */
  daysLeft(validUntil: string): number {
    const ms = new Date(validUntil).getTime() - Date.now();
    return Math.ceil(ms / (24 * 3600 * 1000));
  }
}
