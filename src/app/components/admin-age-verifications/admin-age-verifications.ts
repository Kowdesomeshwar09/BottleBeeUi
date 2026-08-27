import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { AdminFacadeService } from '../../facade/admin.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { humanise, toneFor } from '../../shared/status';

const FILTERS = [
  { label: 'Awaiting review', value: 'PENDING' },
  { label: 'All', value: null },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Expired', value: 'EXPIRED' },
];

/**
 * The age-verification queue.
 *
 * This is the single most consequential review on the platform: approving a
 * document that does not show a legal-age holder puts alcohol in the wrong hands,
 * and every approval is written to the audit log against the reviewer's account.
 * The screen therefore leads with the computed age rather than the raw date, so
 * the reviewer is comparing the same number the compliance engine will.
 */
@Component({
  selector: 'bb-admin-age-verifications',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    StateBlock,
  ],
  templateUrl: './admin-age-verifications.html',
  styleUrls: ['./admin-age-verifications.scss', '../../shared/table-page.scss'],
})
export class AdminAgeVerifications {
  private readonly admin = inject(AdminFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly filters = FILTERS;

  readonly rowsData = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly detail = signal<any | null>(null);
  readonly detailOpen = signal(false);
  readonly loadingDetail = signal(false);

  readonly decisionOpen = signal(false);
  readonly deciding = signal(false);
  decisionTarget: any | null = null;
  decisionStatus = 'APPROVED';
  decisionReason = '';

  filter: string | null = 'PENDING';
  rows = 25;
  first = 0;

  constructor() {
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
    if (this.filter) payload['status'] = this.filter;

    this.admin.ageVerifications(payload).subscribe({
      next: (res) => {
        this.rowsData.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rowsData.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load the queue.'));
      },
    });
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

  /** Age at today's date, computed the same way the compliance engine does. */
  ageOf(dateOfBirth: string | null | undefined): number | null {
    if (!dateOfBirth) return null;

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

    return age;
  }

  /** 21 is the strictest minimum among the regions Bottle Bee serves. */
  isUnderage(dateOfBirth: string | null | undefined): boolean {
    const age = this.ageOf(dateOfBirth);
    return age !== null && age < 21;
  }

  openDetail(row: any): void {
    this.detail.set(null);
    this.detailOpen.set(true);
    this.loadingDetail.set(true);

    // Only the detail endpoint returns the document URLs; the list deliberately
    // withholds them so a queue view cannot leak identity documents.
    this.admin.ageVerificationDetail(row.id).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        this.loadingDetail.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not load that submission',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  askDecision(row: any, status: string): void {
    this.decisionTarget = row;
    this.decisionStatus = status;
    this.decisionReason = '';
    this.decisionOpen.set(true);
  }

  confirmDecision(): void {
    const row = this.decisionTarget;
    if (!row) return;
    if (this.decisionStatus === 'REJECTED' && this.decisionReason.trim().length < 3) return;

    this.deciding.set(true);
    this.admin
      .reviewAgeVerification({
        id: row.id,
        status: this.decisionStatus,
        rejectionReason: this.decisionReason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.deciding.set(false);
          this.decisionOpen.set(false);
          this.detailOpen.set(false);
          this.toast.add({
            severity: 'success',
            summary: `Verification ${humanise(this.decisionStatus).toLowerCase()}`,
            detail:
              this.decisionStatus === 'APPROVED'
                ? 'The customer can now place orders.'
                : 'The customer has been told why, and can submit again.',
            life: 5000,
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

  nameOf(row: any): string {
    const user = row?.user;
    if (!user) return '—';
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
  }
}
