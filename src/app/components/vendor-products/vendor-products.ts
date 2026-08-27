import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ShopFacadeService } from '../../facade/shop.facade.service';
import { VendorFacadeService } from '../../facade/vendor.facade.service';
import { CommonService } from '../../services/common.service';
import { StateBlock } from '../../shared/state-block';
import { MoneyPipe } from '../../shared/money.pipe';
import { humanise, toneFor } from '../../shared/status';
import { BrandRef, CategoryRef, Product } from '../../shared/models/catalog.model';

const PRODUCT_TYPES = [
  'BEER', 'WINE', 'WHISKEY', 'VODKA', 'GIN', 'RUM',
  'TEQUILA', 'BRANDY', 'LIQUEUR', 'CHAMPAGNE', 'OTHER',
].map((value) => ({ label: humanise(value), value }));

const STATUS_FILTERS = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Awaiting approval', value: 'PENDING_APPROVAL' },
  { label: 'Live', value: 'ACTIVE' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Inactive', value: 'INACTIVE' },
];

/**
 * The store's catalogue.
 *
 * A new listing starts as a DRAFT and only reaches the storefront after an
 * administrator approves it — a marketplace selling a licensed product cannot
 * let a seller publish straight to the shelf. The screen makes that path
 * explicit: create, then submit, then wait.
 */
@Component({
  selector: 'bb-vendor-products',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './vendor-products.html',
  styleUrls: ['./vendor-products.scss', '../../shared/table-page.scss'],
})
export class VendorProducts {
  private readonly fb = inject(FormBuilder);
  private readonly vendor = inject(VendorFacadeService);
  private readonly shop = inject(ShopFacadeService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly humanise = humanise;
  readonly toneFor = toneFor;
  readonly productTypes = PRODUCT_TYPES;
  readonly statusFilters = STATUS_FILTERS;

  readonly products = signal<Product[]>([]);
  readonly categories = signal<CategoryRef[]>([]);
  readonly brands = signal<BrandRef[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly busyId = signal<number | null>(null);

  readonly productDialog = signal(false);
  readonly savingProduct = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly variantDialog = signal(false);
  readonly savingVariant = signal(false);
  variantProduct: Product | null = null;

  search = '';
  status: string | null = null;
  rows = 20;
  first = 0;

  private readonly searchInput = new Subject<string>();

  readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    categoryId: [null as number | null, [Validators.required]],
    brandId: [null as number | null],
    productType: ['BEER', [Validators.required]],
    alcoholPercentage: [null as number | null],
    originCountry: [''],
    description: [''],
  });

  /**
   * A first variant is part of creating a product, not a second step. A listing
   * with no size and no price is not something a customer could buy, and the
   * public catalogue excludes products without an active variant anyway.
   */
  readonly variantForm = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(80)]],
    sizeMl: [750, [Validators.required, Validators.min(1)]],
    packSize: [1, [Validators.required, Validators.min(1)]],
    mrp: [0, [Validators.required, Validators.min(0)]],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    taxPercent: [0, [Validators.min(0), Validators.max(100)]],
    initialStock: [0, [Validators.min(0)]],
    reorderLevel: [0, [Validators.min(0)]],
  });

  constructor() {
    this.searchInput.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.first = 0;
      this.load();
    });

    this.load();
    this.loadLookups();
  }

  private loadLookups(): void {
    this.shop.filters().subscribe({
      next: (res) => {
        this.categories.set(res.data?.categories || []);
        this.brands.set(res.data?.brands || []);
      },
      error: () => undefined,
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const payload: Record<string, unknown> = {
      page: Math.floor(this.first / this.rows) + 1,
      limit: this.rows,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };
    if (this.search.trim()) payload['search'] = this.search.trim();
    if (this.status) payload['status'] = this.status;

    this.vendor.products(payload).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.products.set([]);
        this.error.set(CommonService.errorMessage(err, 'Could not load your products.'));
      },
    });
  }

  onSearch(value: string): void {
    this.search = value;
    this.searchInput.next(value);
  }

  onFilter(): void {
    this.first = 0;
    this.load();
  }

  onPage(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 20;
    this.load();
  }

  invalidIn(form: 'productForm' | 'variantForm', control: string): boolean {
    const c = form === 'productForm'
      ? this.productForm.get(control)
      : this.variantForm.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  /* -------------------------------- product ------------------------------- */

  openProduct(product?: Product): void {
    if (product) {
      this.editingId.set(product.id);
      this.productForm.patchValue({
        name: product.name,
        categoryId: product.categoryId,
        brandId: product.brandId,
        productType: product.productType,
        alcoholPercentage: product.alcoholPercentage,
        originCountry: product.originCountry || '',
        description: product.description || '',
      });
    } else {
      this.editingId.set(null);
      this.productForm.reset({ productType: 'BEER' });
      this.variantForm.reset({ sizeMl: 750, packSize: 1, mrp: 0, sellingPrice: 0, taxPercent: 0, initialStock: 0, reorderLevel: 0 });
    }

    this.productDialog.set(true);
  }

  saveProduct(): void {
    const creating = !this.editingId();

    if (this.productForm.invalid || (creating && this.variantForm.invalid)) {
      this.productForm.markAllAsTouched();
      if (creating) this.variantForm.markAllAsTouched();
      return;
    }

    const raw = this.productForm.getRawValue();
    const payload: Record<string, unknown> = {
      name: raw.name,
      categoryId: raw.categoryId,
      brandId: raw.brandId,
      productType: raw.productType,
      alcoholPercentage: raw.alcoholPercentage,
      originCountry: raw.originCountry || null,
      description: raw.description || null,
    };

    this.savingProduct.set(true);

    if (creating) {
      payload['variants'] = [this.variantForm.getRawValue()];

      this.vendor.createProduct(payload).subscribe({
        next: (res) => {
          this.savingProduct.set(false);
          this.productDialog.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Product created as a draft',
            detail: `Submit ${res.data?.name || 'it'} for approval when you are ready.`,
            life: 6000,
          });
          this.load();
        },
        error: (err) => {
          this.savingProduct.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not create that product',
            detail: CommonService.errorMessage(err),
            life: 7000,
          });
        },
      });
      return;
    }

    this.vendor.updateProduct({ id: this.editingId(), ...payload }).subscribe({
      next: () => {
        this.savingProduct.set(false);
        this.productDialog.set(false);
        this.toast.add({ severity: 'success', summary: 'Product updated', life: 3000 });
        this.load();
      },
      error: (err) => {
        this.savingProduct.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Could not update that product',
          detail: CommonService.errorMessage(err),
          life: 7000,
        });
      },
    });
  }

  submitForApproval(product: Product): void {
    this.busyId.set(product.id);
    this.vendor.submitForApproval(product.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.add({
          severity: 'success',
          summary: 'Sent for approval',
          detail: 'An administrator will review it before it appears in the shop.',
          life: 5000,
        });
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.add({
          severity: 'error',
          summary: 'Could not submit that',
          detail: CommonService.errorMessage(err),
          life: 7000,
        });
      },
    });
  }

  remove(product: Product, event: Event): void {
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: `Remove ${product.name} from your catalogue?`,
      header: 'Remove product',
      icon: 'pi pi-trash',
      acceptLabel: 'Remove',
      rejectLabel: 'Keep',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.vendor.deleteProduct(product.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Product removed', life: 3000 });
            this.load();
          },
          error: (err) =>
            this.toast.add({
              severity: 'error',
              summary: 'Could not remove that product',
              detail: CommonService.errorMessage(err),
              life: 7000,
            }),
        });
      },
    });
  }

  /* -------------------------------- variant ------------------------------- */

  openVariant(product: Product): void {
    this.variantProduct = product;
    this.variantForm.reset({
      sizeMl: 750, packSize: 1, mrp: 0, sellingPrice: 0, taxPercent: 0, initialStock: 0, reorderLevel: 0,
    });
    this.variantDialog.set(true);
  }

  saveVariant(): void {
    if (!this.variantProduct || this.variantForm.invalid) {
      this.variantForm.markAllAsTouched();
      return;
    }

    this.savingVariant.set(true);
    this.vendor
      .createVariant({ productId: this.variantProduct.id, ...this.variantForm.getRawValue() })
      .subscribe({
        next: () => {
          this.savingVariant.set(false);
          this.variantDialog.set(false);
          this.toast.add({ severity: 'success', summary: 'Size added', life: 3000 });
          this.load();
        },
        error: (err) => {
          this.savingVariant.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not add that size',
            detail: CommonService.errorMessage(err),
            life: 7000,
          });
        },
      });
  }

  /** Cheapest listed price, for the table's single price column. */
  priceFrom(product: Product): number | null {
    const variants = product.variants || [];
    if (!variants.length) return null;
    return Math.min(...variants.map((v) => v.sellingPrice));
  }

  stockOf(product: Product): number {
    return (product.variants || []).reduce(
      (sum, v) => sum + (v.inventory?.quantityAvailable ?? 0),
      0,
    );
  }
}
