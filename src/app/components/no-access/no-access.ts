import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthenticateService } from '../../services/authenticate.service';

@Component({
  selector: 'bb-no-access',
  imports: [ButtonModule],
  template: `
    <div class="bb-page">
      <div class="bb-state">
        <i class="pi pi-lock"></i>
        <h3>You do not have access to that</h3>
        <p>
          Your account is signed in, but it is not permitted to open this page. If you think it
          should be, ask an administrator to review your role.
        </p>
        <p-button label="Back to your home page" icon="pi pi-home" (onClick)="goHome()" />
      </div>
    </div>
  `,
})
export class NoAccess {
  private readonly auth = inject(AuthenticateService);
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigateByUrl(this.auth.homeRoute());
  }
}
