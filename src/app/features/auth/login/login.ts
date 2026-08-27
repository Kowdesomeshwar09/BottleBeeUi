import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AppConfig } from '../../../config/app-config';
import { AuthFacadeService } from '../../../facade/auth.facade.service';
import { AuthenticateService } from '../../../services/authenticate.service';
import { CommonService } from '../../../services/common.service';

@Component({
  selector: 'bb-login',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, PasswordModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthFacadeService);
  private readonly session = inject(AuthenticateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(AppConfig.constants.EMAIL_REGEX)]],
    password: ['', [Validators.required]],
  });

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.submitting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        // Return to wherever the guard interrupted, otherwise to the home the
        // user's roles imply — an admin has no business landing on the shop.
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || this.session.homeRoute());
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not sign you in.'));
      },
    });
  }
}
