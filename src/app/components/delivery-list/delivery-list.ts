import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { DeliveryFacadeService } from '../../facade/delivery.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';

const VEHICLE_TYPES = [
  { label: 'Bike', value: 'BIKE' },
  { label: 'Scooter', value: 'SCOOTER' },
  { label: 'Car', value: 'CAR' },
  { label: 'Van', value: 'VAN' },
];

const FILTERS = [
  { label: 'Live', value: 'LIVE' },
  { label: 'All', value: 'ALL' },
  { label: 'Done', value: 'DONE' },
];

/** Everything a rider still has to act on. */
const LIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
const DONE_STATUSES = ['DELIVERED', 'REJECTED', 'FAILED', 'CANCELLED'];

/**
 * The rider's queue.
 *
 * Built for one hand on a phone: the primary action for each run is a single
 * full-width button, and the list defaults to the runs still needing attention
 * rather than the full history.
 */
@Component({
  selector: 'bb-delivery-list',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    SelectButtonModule,
    SelectModule,
    TagModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './delivery-list.html',
  styleUrl: './delivery-list.scss',
})
export class DeliveryList {
  private readonly fb = inject(FormBuilder);
  private readonly delivery = inject(DeliveryFacadeService);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly vehicleTypes = VEHICLE_TYPES;
  readonly filters = FILTERS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly assignments = signal<any[]>([]);
  readonly partner = signal<any | null>(null);
  readonly noProfile = signal(false);
  readonly busyId = signal<number | null>(null);

  readonly profileDialog = signal(false);
  readonly savingProfile = signal(false);
  licenseDocument: File | null = null;

  filter = 'LIVE';

  readonly profileForm = this.fb.nonNullable.group({
    vehicleType: ['BIKE', [Validators.required]],
    vehicleNumber: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
    licenseNumber: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
  });

  readonly visible = computed(() => {
    const all = this.assignments();
    if (this.filter === 'ALL') return all;
    if (this.filter === 'DONE') return all.filter((a) => DONE_STATUSES.includes(a.status));
    return all.filter((a) => LIVE_STATUSES.includes(a.status));
  });

  readonly liveCount = computed(
    () => this.assignments().filter((a) => LIVE_STATUSES.includes(a.status)).length,
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.noProfile.set(false);

    this.delivery.myProfile().subscribe({
      next: (res) => {
        this.partner.set(res.data);
        if (res.data) {
          this.profileForm.patchValue({
            vehicleType: res.data.vehicleType || 'BIKE',
            vehicleNumber: res.data.vehicleNumber || '',
            licenseNumber: res.data.licenseNumber || '',
          });
        }
        this.loadAssignments();
      },
      error: (err) => {
        // 404 means the account has no partner record yet. That is the normal
        // starting state for a new rider, not a failure — they need the form.
        if (err?.status === 404) {
          this.noProfile.set(true);
          this.loading.set(false);
          return;
        }

        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load your profile.'));
      },
    });
  }

  private loadAssignments(): void {
    this.delivery.myDeliveries({ limit: 50, sortBy: 'createdAt', sortOrder: 'DESC' }).subscribe({
      next: (res) => {
        this.assignments.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.assignments.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load your deliveries.'));
      },
    });
  }

  pickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.licenseDocument = input.files?.[0] ?? null;
  }

  invalid(control: string): boolean {
    const c = this.profileForm.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    const form = new FormData();
    form.append('vehicleType', raw.vehicleType);
    form.append('vehicleNumber', raw.vehicleNumber);
    form.append('licenseNumber', raw.licenseNumber);
    if (this.licenseDocument) form.append('licenseDocument', this.licenseDocument);

    this.savingProfile.set(true);
    this.delivery.saveProfile(form).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileDialog.set(false);
        this.licenseDocument = null;
        this.toast.add({
          severity: 'success',
          summary: 'Details saved',
          detail: 'An administrator will review them before you can take runs.',
          life: 5000,
        });
        this.load();
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not save your details',
          detail: CommonService.errorMessage(err),
          life: 7000,
        });
      },
    });
  }

  respond(assignment: any, accept: boolean): void {
    this.busyId.set(assignment.id);

    this.delivery
      .respond(assignment.id, accept, accept ? undefined : 'Cannot take this run right now')
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'success',
            summary: accept ? 'Run accepted' : 'Run declined',
            life: 3000,
          });
          this.loadAssignments();
        },
        error: (err) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not update that run',
            detail: CommonService.errorMessage(err),
            life: 6000,
          });
        },
      });
  }

  /** Shares the phone's location so the customer's tracking screen is current. */
  shareLocation(): void {
    if (!navigator.geolocation) {
      this.toast.add({
        severity: 'warn',
        summary: 'Location not available',
        detail: 'This device or browser does not offer location.',
        life: 5000,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.delivery
          .updateLocation(position.coords.latitude, position.coords.longitude)
          .subscribe({
            next: () =>
              this.toast.add({ severity: 'success', summary: 'Location shared', life: 2500 }),
            error: (err) =>
              this.toast.add({
                severity: 'error',
                summary: 'Could not share your location',
                detail: CommonService.errorMessage(err),
                life: 6000,
              }),
          });
      },
      () =>
        this.toast.add({
          severity: 'warn',
          summary: 'Location permission refused',
          detail: 'Allow location access to share your position with customers.',
          life: 6000,
        }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
}
