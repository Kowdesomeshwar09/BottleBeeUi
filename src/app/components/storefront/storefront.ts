import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { RatingModule } from 'primeng/rating';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SliderModule } from 'primeng/slider';
import { TagModule } from 'primeng/tag';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ShopFacadeService } from '../../facade/shop.facade.service';
import { AuthenticateService } from '../../services/authenticate.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { AssetUrlPipe } from '../../shared/asset-url.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise } from '../../shared/status';
import { BrandRef, CategoryRef, Product, ProductVariant } from '../../shared/models/catalog.model';

interface SortOption {
  label: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const SORTS: SortOption[] = [
  { label: 'Newest first', sortBy: 'createdAt', sortOrder: 'DESC' },
  { label: 'Price: low to high', sortBy: 'price', sortOrder: 'ASC' },
  { label: 'Price: high to low', sortBy: 'price', sortOrder: 'DESC' },
  { label: 'Best rated', sortBy: 'ratingAvg', sortOrder: 'DESC' },
  { label: 'Name A–Z', sortBy: 'name', sortOrder: 'ASC' },
];

@Component({
  selector: 'bb-storefront',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PaginatorModule,
    RatingModule,
    SelectModule,
    SkeletonModule,
    SliderModule,
    TagModule,
    StateBlock,
    MoneyPipe,
    AssetUrlPipe,
  ],
  templateUrl: './storefront.html',
  styleUrl: './storefront.scss',
})
export class Storefront {
  private readonly shop = inject(ShopFacadeService);
  private readonly session = inject(AuthenticateService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly humanise = humanise;
  readonly sorts = SORTS;

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(12);
  readonly addingId = signal<number | null>(null);

  readonly categories = signal<CategoryRef[]>([]);
  readonly brands = signal<BrandRef[]>([]);
  readonly productTypes = signal<{ label: string; value: string; count: number }[]>([]);
  readonly priceCeiling = signal(10000);
  readonly filtersOpen = signal(false);

  /* Filter state, bound with ngModel because these are plain values, not a form. */
  search = '';
  categoryId: number | null = null;
  brandId: number | null = null;
  productType: string | null = null;
  priceRange: [number, number] = [0, 10000];
  inStockOnly = false;
  sort: SortOption = SORTS[0];

  private readonly searchInput = new Subject<string>();

  constructor() {
    this.searchInput.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.load();
    });

    this.loadFilters();
    this.load();
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchInput.next(value);
  }

  private loadFilters(): void {
    this.shop.filters().subscribe({
      next: (res) => {
        if (!res.success) return;
        this.categories.set(res.data.categories || []);
        this.brands.set(res.data.brands || []);
        this.productTypes.set(
          (res.data.productTypes || []).map((t: any) => ({
            label: `${humanise(t.type)} (${t.count})`,
            value: t.type,
            count: t.count,
          })),
        );

        // Round the ceiling up so the slider handle can actually reach the most
        // expensive bottle rather than stopping a rupee short of it.
        const max = Math.ceil((res.data.priceRange?.max || 10000) / 500) * 500 || 10000;
        this.priceCeiling.set(max);
        this.priceRange = [0, max];
      },
      // A failed filter load leaves the sidebar empty; the grid still works, so
      // this is not worth an error screen.
      error: () => undefined,
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sort.sortBy,
      sortOrder: this.sort.sortOrder,
    };

    if (this.search.trim()) payload['search'] = this.search.trim();
    if (this.categoryId) payload['categoryId'] = this.categoryId;
    if (this.brandId) payload['brandId'] = this.brandId;
    if (this.productType) payload['productType'] = this.productType;
    if (this.inStockOnly) payload['inStockOnly'] = true;
    if (this.priceRange[0] > 0) payload['minPrice'] = this.priceRange[0];
    if (this.priceRange[1] < this.priceCeiling()) payload['maxPrice'] = this.priceRange[1];

    this.shop.listProducts(payload).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.products.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load products.'));
      },
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.filtersOpen.set(false);
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.categoryId = null;
    this.brandId = null;
    this.productType = null;
    this.inStockOnly = false;
    this.priceRange = [0, this.priceCeiling()];
    this.sort = SORTS[0];
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return (
      !!this.search ||
      !!this.categoryId ||
      !!this.brandId ||
      !!this.productType ||
      this.inStockOnly ||
      this.priceRange[0] > 0 ||
      this.priceRange[1] < this.priceCeiling()
    );
  }

  onPage(event: PaginatorState): void {
    this.page.set((event.page ?? 0) + 1);
    this.limit.set(event.rows ?? 12);
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------- helpers ------------------------------- */

  /** The variant a card represents: cheapest in stock, else simply cheapest. */
  primaryVariant(product: Product): ProductVariant | null {
    const variants = product.variants || [];
    if (!variants.length) return null;

    const inStock = variants.filter((v) => (v.inventory?.quantityAvailable ?? 0) > 0);
    const pool = inStock.length ? inStock : variants;
    return pool.reduce((best, v) => (v.sellingPrice < best.sellingPrice ? v : best), pool[0]);
  }

  imageFor(product: Product): string | null {
    const images = product.images || [];
    return (images.find((i) => i.isPrimary) || images[0])?.imageUrl || null;
  }

  inStock(product: Product): boolean {
    return (this.primaryVariant(product)?.inventory?.quantityAvailable ?? 0) > 0;
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.session.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop' } });
      return;
    }

    const variant = this.primaryVariant(product);
    if (!variant) return;

    this.addingId.set(product.id);
    this.shop.addToCart(variant.id, 1).subscribe({
      next: (res) => {
        this.addingId.set(null);
        this.toast.add({
          severity: 'success',
          summary: 'Added to cart',
          detail: `${product.name}${variant.label ? ` · ${variant.label}` : ''}`,
          life: 2500,
        });

        // A cart holds one store's items at a time; the API says so plainly and
        // the customer should hear it rather than wonder where the rest went.
        const warning = (res.data?.warnings || [])[0];
        if (warning) {
          this.toast.add({ severity: 'warn', summary: 'Note', detail: warning, life: 6000 });
        }
      },
      error: (err) => {
        this.addingId.set(null);
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
