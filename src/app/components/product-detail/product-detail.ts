import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';

import { ShopFacadeService } from '../../facade/shop.facade.service';
import { AuthenticateService } from '../../services/authenticate.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { AssetUrlPipe } from '../../shared/asset-url.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise } from '../../shared/status';
import { Product, ProductVariant } from '../../shared/models/catalog.model';

interface PublicReview {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  reviewer: string;
}

@Component({
  selector: 'bb-product-detail',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DividerModule,
    InputNumberModule,
    MessageModule,
    RatingModule,
    TagModule,
    StateBlock,
    MoneyPipe,
    AssetUrlPipe,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly shop = inject(ShopFacadeService);
  private readonly session = inject(AuthenticateService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** Bound from the route by `withComponentInputBinding`. */
  readonly slug = input<string>('');

  readonly humanise = humanise;

  readonly product = signal<Product | null>(null);
  readonly reviews = signal<PublicReview[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly adding = signal(false);

  readonly selectedVariantId = signal<number | null>(null);
  quantity = 1;
  readonly activeImage = signal<string | null>(null);

  readonly variants = computed(() => this.product()?.variants ?? []);

  readonly selected = computed<ProductVariant | null>(() => {
    const id = this.selectedVariantId();
    return this.variants().find((v) => v.id === id) ?? null;
  });

  readonly available = computed(() => this.selected()?.inventory?.quantityAvailable ?? 0);

  /**
   * Capped at ten because that is a plausible single-order quantity, and the
   * per-order limits the compliance engine enforces are region-specific and
   * checked server-side — this only avoids offering an obviously futile amount.
   */
  readonly maxQuantity = computed(() => Math.max(1, Math.min(10, this.available())));

  constructor() {
    // The slug is an input, but this screen loads once per navigation, so an
    // effect would only re-fire on a value that cannot change while mounted.
    queueMicrotask(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shop.productDetail({ slug: this.slug() }).subscribe({
      next: (res) => {
        const product: Product = res.data;
        this.product.set(product);
        this.reviews.set(res.data?.reviews || []);

        const first =
          (product.variants || []).find((v) => (v.inventory?.quantityAvailable ?? 0) > 0) ||
          (product.variants || [])[0];
        this.selectedVariantId.set(first?.id ?? null);

        const images = product.images || [];
        this.activeImage.set((images.find((i) => i.isPrimary) || images[0])?.imageUrl ?? null);

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load this product.'));
      },
    });
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariantId.set(variant.id);
    this.quantity = 1;
  }

  addToCart(): void {
    if (!this.session.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/shop/product/${this.slug()}` },
      });
      return;
    }

    const variant = this.selected();
    if (!variant) return;

    this.adding.set(true);
    this.shop.addToCart(variant.id, this.quantity).subscribe({
      next: (res) => {
        this.adding.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Added to cart',
          detail: `${this.quantity} × ${this.product()?.name}`,
          life: 2500,
        });

        const warning = (res.data?.warnings || [])[0];
        if (warning) {
          this.toast.add({ severity: 'warn', summary: 'Note', detail: warning, life: 6000 });
        }
      },
      error: (err) => {
        this.adding.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not add that',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }

  buyNow(): void {
    if (!this.session.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/shop/product/${this.slug()}` },
      });
      return;
    }

    const variant = this.selected();
    if (!variant) return;

    this.adding.set(true);
    this.shop.addToCart(variant.id, this.quantity).subscribe({
      next: () => {
        this.adding.set(false);
        this.router.navigate(['/cart']);
      },
      error: (err) => {
        this.adding.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not add that',
          detail: CommonService.errorMessage(err),
          life: 6000,
        });
      },
    });
  }
}
