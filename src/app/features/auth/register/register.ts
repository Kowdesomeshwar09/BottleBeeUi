import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SelectButtonModule } from 'primeng/selectbutton';

import { AppConfig } from '../../../config/app-config';
import { AuthFacadeService } from '../../../facade/auth.facade.service';
import { AuthenticateService } from '../../../services/authenticate.service';
import { CommonService } from '../../../services/common.service';

/** Passwords must agree. Reported on the group, not on either field. */
const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };

@Component({
  selector: 'bb-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    SelectButtonModule,
  ],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthFacadeService);
  private readonly session = inject(AuthenticateService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly accountTypes = [
    { label: 'I want to buy', value: 'CUSTOMER' },
    { label: 'I run a store', value: 'VENDOR' },
    { label: 'I deliver', value: 'DELIVERY_PARTNER' },
  ];

  /**
   * The youngest permitted date of birth. 21 is the strictest minimum among the
   * regions Bottle Bee serves; the server re-checks against the actual delivery
   * region, so this only keeps the obviously ineligible from filling in a form
   * that cannot succeed.
   */
  readonly maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 21);
    return d;
  })();

  readonly minDob = new Date(1920, 0, 1);

  readonly form = this.fb.nonNullable.group(
    {
      accountType: ['CUSTOMER'],
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.pattern(AppConfig.constants.EMAIL_REGEX)]],
      phone: ['', [Validators.required, Validators.pattern(AppConfig.constants.PHONE_REGEX)]],
      dateOfBirth: [null as Date | null],
      password: ['', [Validators.required, Validators.pattern(AppConfig.constants.PASSWORD_REGEX)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly accountType = signal('CUSTOMER');
  readonly isCustomer = computed(() => this.accountType() === 'CUSTOMER');

  constructor() {
    this.form.controls.accountType.valueChanges.subscribe((value) => {
      this.accountType.set(value);

      // Only customers must give a date of birth at registration; vendors and
      // riders supply theirs during onboarding, where it is checked against
      // documents rather than taken on trust.
      const dob = this.form.controls.dateOfBirth;
      if (value === 'CUSTOMER') {
        dob.setValidators([Validators.required]);
      } else {
        dob.clearValidators();
        dob.setValue(null);
      }
      dob.updateValueAndValidity();
    });

    this.form.controls.dateOfBirth.setValidators([Validators.required]);
    this.form.controls.dateOfBirth.updateValueAndValidity();
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  get mismatch(): boolean {
    return (
      this.form.hasError('mismatch') &&
      !!this.form.controls.confirmPassword.value &&
      this.form.controls.confirmPassword.touched
    );
  }

  submit(): void {
    if (this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      accountType: raw.accountType,
      firstName: raw.firstName,
      lastName: raw.lastName || null,
      email: raw.email,
      phone: raw.phone,
      password: raw.password,
      confirmPassword: raw.confirmPassword,
    };

    if (raw.dateOfBirth) {
      // A plain date, not an instant: the birthday must not shift by a timezone.
      const d = raw.dateOfBirth;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      payload['dateOfBirth'] = `${d.getFullYear()}-${month}-${day}`;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.register(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl(this.session.homeRoute());
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not create your account.'));
      },
    });
  }
}
