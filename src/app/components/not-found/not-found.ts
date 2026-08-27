import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'bb-not-found',
  imports: [ButtonModule, RouterLink],
  template: `
    <div class="bb-page">
      <div class="bb-state">
        <i class="pi pi-compass"></i>
        <h3>That page does not exist</h3>
        <p>The link may be out of date, or the address may have a typo in it.</p>
        <a routerLink="/shop"><p-button label="Go to the shop" icon="pi pi-shopping-bag" /></a>
      </div>
    </div>
  `,
})
export class NotFound {}
