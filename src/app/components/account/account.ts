import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';

import { AppConfig } from '../../config/app-config';
import { ShopFacadeService } from '../../facade/shop.facade.service';
import { AuthenticateService } from '../../services/authenticate.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { humanise, toneFor } from '../../shared/status';
import {
  AgeVerification,
  CustomerAddress,
  CustomerProfile,
  OrderEligibility,
} from '../../shared/models/customer.model';

const DOCUMENT_TYPES = [
  { label: 'Aadhaar', value: 'AADHAAR' },
  { label: 'Passport', value: 'PASSPORT' },
  { label: 'Driving licence', value: 'DRIVING_LICENSE' },
  { label: 'Voter ID', value: 'VOTER_ID' },
  { label: 'Other government ID', value: 'OTHER' },
];

const GENDERS = [
  { label: 'Prefer not to say', value: null },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
  { label: 'Other', value: 'OTHER' },
];

/** A plain calendar date, so a birthday never shifts by a timezone. */
const toDateOnly = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'bb-account',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TabsModule,
    TagModule,
    StateBlock,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  private readonly fb = inject(FormBuilder);
  private readonly shop = inject(ShopFacadeService);
  private readonly session = inject(AuthenticateService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly documentTypes = DOCUMENT_TYPES;
  readonly genders = GENDERS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly profile = signal<CustomerProfile | null>(null);
  readonly addresses = signal<CustomerAddress[]>([]);
  readonly verification = signal<AgeVerification | null>(null);
  readonly eligibility = signal<OrderEligibility | null>(null);

  readonly savingProfile = signal(false);
  readonly savingAddress = signal(false);
  readonly submittingKyc = signal(false);
  readonly addressDialog = signal(false);
  readonly editingAddressId = signal<number | null>(null);

  readonly user = this.session.user;

  readonly maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  })();

  readonly minDob = new Date(1920, 0, 1);

  readonly profileForm = this.fb.nonNullable.group({
    legalFirstName: ['', [Validators.required, Validators.maxLength(100)]],
    legalLastName: ['', [Validators.required, Validators.maxLength(100)]],
    dateOfBirth: [null as Date | null, [Validators.required]],
    gender: [null as string | null],
    marketingOptIn: [false],
  });

  readonly addressForm = this.fb.nonNullable.group({
    label: ['Home'],
    recipientName: ['', [Validators.required, Validators.maxLength(150)]],
    phone: ['', [Validators.required, Validators.pattern(AppConfig.constants.PHONE_REGEX)]],
    addressLine1: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    addressLine2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    postalCode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]],
    deliveryInstructions: [''],
    isDefault: [false],
  });

  readonly kycForm = this.fb.nonNullable.group({
    documentType: ['AADHAAR', [Validators.required]],
    documentNumber: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(64)]],
    dateOfBirth: [null as Date | null, [Validators.required]],
  });

  documentFront: File | null = null;
  documentBack: File | null = null;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shop.profile().subscribe({
      next: (res) => {
        const profile: CustomerProfile | null = res.data ?? null;
        this.profile.set(profile);

        if (profile) {
          this.profileForm.patchValue({
            legalFirstName: profile.legalFirstName || '',
            legalLastName: profile.legalLastName || '',
            dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
            gender: profile.gender ?? null,
            marketingOptIn: !!profile.marketingOptIn,
          });

          if (profile.dateOfBirth) {
            this.kycForm.patchValue({ dateOfBirth: new Date(profile.dateOfBirth) });
          }
        }

        this.loading.set(false);
        this.loadRest();
      },
      error: (err) => {
        // A 404 here means "no profile yet", which is a normal state for a new
        // account, not a failure. The form simply starts empty.
        if (err?.status === 404) {
          this.profile.set(null);
          this.loading.set(false);
          this.loadRest();
          return;
        }

        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load your account.'));
      },
    });
  }

  private loadRest(): void {
    this.shop.addresses().subscribe({
      next: (res) => this.addresses.set(res.data || []),
      error: () => this.addresses.set([]),
    });

    this.shop.ageVerificationStatus().subscribe({
      next: (res) => this.verification.set(res.data ?? null),
      error: () => this.verification.set(null),
    });

    this.shop.eligibility().subscribe({
      next: (res) => this.eligibility.set(res.data ?? null),
      error: () => this.eligibility.set(null),
    });
  }

  /* -------------------------------- profile ------------------------------- */

  /**
   * Each of the three forms is strongly typed with a different shape, so
   * indexing them produces a union whose `get` signatures do not unify. The
   * cast is to the untyped base class only — every field name in the templates
   * is still checked against the form it belongs to.
   */
  invalidIn(form: 'profileForm' | 'addressForm' | 'kycForm', control: string): boolean {
    const group = this[form] as unknown as FormGroup;
    const c = group.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    this.savingProfile.set(true);

    this.shop
      .saveProfile({
        legalFirstName: raw.legalFirstName,
        legalLastName: raw.legalLastName,
        dateOfBirth: raw.dateOfBirth ? toDateOnly(raw.dateOfBirth) : undefined,
        gender: raw.gender,
        marketingOptIn: raw.marketingOptIn,
      })
      .subscribe({
        next: (res) => {
          this.savingProfile.set(false);
          this.profile.set(res.data);
          this.toast.add({ severity: 'success', summary: 'Profile saved', life: 3000 });
          this.loadRest();
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not save your profile',
            detail: CommonService.errorMessage(err),
            life: 6000,
          });
        },
      });
  }

  /* ------------------------------- addresses ------------------------------ */

  openAddressDialog(address?: CustomerAddress): void {
    if (address) {
      this.editingAddressId.set(address.id);
      this.addressForm.patchValue({
        label: address.label || '',
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        deliveryInstructions: address.deliveryInstructions || '',
        isDefault: address.isDefault,
      });
    } else {
      this.editingAddressId.set(null);
      this.addressForm.reset({ label: 'Home', isDefault: this.addresses().length === 0 });
    }

    this.addressDialog.set(true);
  }

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    const raw = this.addressForm.getRawValue();
    const id = this.editingAddressId();
    this.savingAddress.set(true);

    const request = id
      ? this.shop.updateAddress({ id, ...raw })
      : this.shop.createAddress(raw);

    request.subscribe({
      next: () => {
        this.savingAddress.set(false);
        this.addressDialog.set(false);
        this.toast.add({
          severity: 'success',
          summary: id ? 'Address updated' : 'Address added',
          life: 3000,
        });
        this.loadRest();
      },
      error: (err) => {
        this.savingAddress.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not save that address',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  setDefault(address: CustomerAddress): void {
    this.shop.setDefaultAddress(address.id).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Default address updated', life: 2500 });
        this.loadRest();
      },
      error: (err) =>
        this.toast.add({
          severity: 'error',
          summary: 'Could not change the default',
          detail: CommonService.errorMessage(err),
          life: 6000,
        }),
    });
  }

  deleteAddress(address: CustomerAddress, event: Event): void {
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: `Remove ${address.label || 'this address'}?`,
      header: 'Remove address',
      icon: 'pi pi-trash',
      acceptLabel: 'Remove',
      rejectLabel: 'Keep',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.shop.deleteAddress(address.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Address removed', life: 2500 });
            this.loadRest();
          },
          error: (err) =>
            this.toast.add({
              severity: 'error',
              summary: 'Could not remove that address',
              detail: CommonService.errorMessage(err),
              life: 6000,
            }),
        });
      },
    });
  }

  /* --------------------------- age verification --------------------------- */

  get canSubmitKyc(): boolean {
    const status = this.verification()?.status;
    return status !== 'PENDING' && status !== 'APPROVED';
  }

  pickFile(which: 'front' | 'back', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (which === 'front') this.documentFront = file;
    else this.documentBack = file;
  }

  submitKyc(): void {
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }

    if (!this.documentFront) {
      this.toast.add({
        severity: 'warn',
        summary: 'Add a photo of the document',
        detail: 'We need at least the front of the ID to verify it.',
        life: 5000,
      });
      return;
    }

    const raw = this.kycForm.getRawValue();
    const form = new FormData();
    form.append('documentType', raw.documentType);
    form.append('documentNumber', raw.documentNumber);
    if (raw.dateOfBirth) form.append('dateOfBirth', toDateOnly(raw.dateOfBirth));
    form.append('documentFront', this.documentFront);
    if (this.documentBack) form.append('documentBack', this.documentBack);

    this.submittingKyc.set(true);
    this.shop.submitAgeVerification(form).subscribe({
      next: (res) => {
        this.submittingKyc.set(false);
        this.verification.set(res.data);
        this.documentFront = null;
        this.documentBack = null;
        this.kycForm.patchValue({ documentNumber: '' });
        this.toast.add({
          severity: 'success',
          summary: 'Submitted for review',
          detail: 'We will let you know once it has been checked.',
          life: 5000,
        });
      },
      error: (err) => {
        this.submittingKyc.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not submit that',
          detail: CommonService.errorMessage(err),
          life: 8000,
        });
      },
    });
  }

  /** The eligibility endpoint returns either strings or coded objects. */
  reasonText(reason: any): string {
    return typeof reason === 'string' ? reason : reason?.message || 'Not eligible';
  }
}
