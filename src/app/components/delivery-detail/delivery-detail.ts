import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TimelineModule } from 'primeng/timeline';

import { DeliveryFacadeService } from '../../facade/delivery.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';

const DOCUMENT_TYPES = [
  { label: 'Aadhaar', value: 'AADHAAR' },
  { label: 'Passport', value: 'PASSPORT' },
  { label: 'Driving licence', value: 'DRIVING_LICENSE' },
  { label: 'Voter ID', value: 'VOTER_ID' },
  { label: 'Other government ID', value: 'OTHER' },
];

/**
 * One delivery run, from pickup to handover.
 *
 * The ID check is deliberately its own step with its own record rather than a
 * checkbox on the completion form. "I checked their ID, and this is what I
 * checked" is a statement the platform has to be able to stand behind later,
 * and the API refuses to complete a delivery until it has been made.
 */
@Component({
  selector: 'bb-delivery-detail',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    DividerModule,
    MessageModule,
    SelectModule,
    TagModule,
    TextareaModule,
    TimelineModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './delivery-detail.html',
  styleUrl: './delivery-detail.scss',
})
export class DeliveryDetail {
  private readonly delivery = inject(DeliveryFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly id = input<string>('');

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly documentTypes = DOCUMENT_TYPES;

  readonly run = signal<any | null>(null);
  readonly history = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  readonly idDialog = signal(false);
  readonly failDialog = signal(false);
  documentType = 'AADHAAR';
  idNotes = '';
  failReason = '';
  completionNote = '';

  readonly status = computed(() => this.run()?.status ?? null);
  readonly verified = computed(() => !!this.run()?.recipientVerified);

  readonly canPickUp = computed(() => this.status() === 'ACCEPTED');
  readonly canTransit = computed(() => this.status() === 'PICKED_UP');
  readonly canCheckId = computed(
    () => ['PICKED_UP', 'IN_TRANSIT'].includes(this.status() || '') && !this.verified(),
  );
  readonly canComplete = computed(
    () => ['PICKED_UP', 'IN_TRANSIT'].includes(this.status() || '') && this.verified(),
  );
  readonly canFail = computed(() =>
    ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(this.status() || ''),
  );

  readonly finished = computed(() =>
    ['DELIVERED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(this.status() || ''),
  );

  constructor() {
    queueMicrotask(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.delivery.detail(Number(this.id())).subscribe({
      next: (res) => {
        this.run.set(res.data);
        this.history.set(res.data?.statusHistory || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load this run.'));
      },
    });
  }

  private handle(summary: string) {
    return {
      next: () => {
        this.busy.set(false);
        this.toast.add({ severity: 'success', summary, life: 3000 });
        this.load();
      },
      error: (err: any) => {
        this.busy.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'That did not go through',
          detail: CommonService.errorMessage(err),
          life: 8000,
        });
      },
    };
  }

  advance(status: string, summary: string): void {
    this.busy.set(true);
    this.delivery.advance({ id: Number(this.id()), status }).subscribe(this.handle(summary));
  }

  checkId(verified: boolean): void {
    if (!verified && this.idNotes.trim().length < 3) return;

    this.busy.set(true);
    this.delivery
      .verifyRecipient({
        id: Number(this.id()),
        verified,
        documentType: verified ? this.documentType : undefined,
        notes: this.idNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.idDialog.set(false);
          this.idNotes = '';
          this.toast.add({
            severity: verified ? 'success' : 'warn',
            summary: verified ? 'ID recorded' : 'Recorded as not verified',
            detail: verified
              ? 'You can complete the delivery now.'
              : 'Do not hand the order over. Mark the run as failed and return it to the store.',
            life: 7000,
          });
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not record that',
            detail: CommonService.errorMessage(err),
            life: 8000,
          });
        },
      });
  }

  complete(): void {
    this.busy.set(true);
    this.delivery
      .complete(Number(this.id()), this.completionNote.trim() || undefined)
      .subscribe(this.handle('Delivered'));
  }

  fail(): void {
    if (this.failReason.trim().length < 3) return;

    this.busy.set(true);
    this.delivery
      .advance({ id: Number(this.id()), status: 'FAILED', reason: this.failReason.trim() })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.failDialog.set(false);
          this.failReason = '';
          this.toast.add({
            severity: 'warn',
            summary: 'Run marked failed',
            detail: 'Return the order to the store.',
            life: 6000,
          });
          this.load();
        },
        error: (err) => {
          this.busy.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not mark it failed',
            detail: CommonService.errorMessage(err),
            life: 8000,
          });
        },
      });
  }

  /** Opens the address in whatever maps app the device has. */
  openMap(): void {
    const address = this.run()?.order?.deliveryAddress;
    if (!address) return;

    const query =
      address.latitude && address.longitude
        ? `${address.latitude},${address.longitude}`
        : [address.addressLine1, address.city, address.state, address.postalCode]
          .filter(Boolean)
          .join(', ');

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  }

  back(): void {
    this.router.navigate(['/delivery/my-deliveries']);
  }
}
