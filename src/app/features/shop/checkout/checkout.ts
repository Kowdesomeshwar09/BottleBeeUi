import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';

import { AppConfig } from '../../../config/app-config';
import { ShopFacadeService } from '../../../facade/shop.facade.service';
import { CommonService } from '../../../services/common.service';
import { StateBlock } from '../../../shared/components/state-block';
import { MoneyPipe } from '../../../shared/money.pipe';
import { Cart } from '../../../shared/models/cart.model';
import { CustomerAddress } from '../../../shared/models/customer.model';

interface Blocker {
  code: string;
  message: string;
  [k: string]: any;
}

const PAYMENT_METHODS = [
  {
    value: 'CASH',
    label: 'Cash on delivery',
    hint: 'Pay the delivery partner when your order arrives.',
    icon: 'pi-wallet',
  },
  {
    value: 'RAZORPAY',
    label: 'Pay online',
    hint: 'UPI, card or netbanking through our payment provider.',
    icon: 'pi-credit-card',
  },
];

/**
 * Checkout.
 *
 * Nothing about the money is decided here. The client sends an address, a
 * payment method and an optional note; the server recomputes every total,
 * re-runs the compliance rules against the delivery region and reserves stock
 * inside the same transaction that creates the order. What this screen owes the
 * customer is an honest account of anything that would stop that from
 * succeeding, before they commit to it.
 */
@Component({
  selector: 'bb-checkout',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    DividerModule,
    InputTextModule,
    MessageModule,
    RadioButtonModule,
    TextareaModule,
    StateBlock,
    MoneyPipe,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly fb = inject(FormBuilder);
  private readonly shop = inject(ShopFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly paymentMethods = PAYMENT_METHODS;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly validating = signal(false);
  readonly placing = signal(false);

  readonly cart = signal<Cart | null>(null);
  readonly addresses = signal<CustomerAddress[]>([]);
  readonly blockers = signal<Blocker[]>([]);
  readonly compliance = signal<any | null>(null);
  readonly ready = signal(false);

  readonly addressDialog = signal(false);
  readonly savingAddress = signal(false);

  selectedAddressId: number | null = null;
  paymentMethod = 'CASH';
  customerNotes = '';

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
    isDefault: [true],
  });

  readonly selectedAddress = computed(() =>
    this.addresses().find((a) => a.id === this.selectedAddressId) ?? null,
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.shop.addresses().subscribe({
      next: (res) => {
        const list: CustomerAddress[] = res.data || [];
        this.addresses.set(list);
        this.selectedAddressId = (list.find((a) => a.isDefault) || list[0])?.id ?? null;
        this.loading.set(false);
        this.validate();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(CommonService.errorMessage(err, 'Could not load your addresses.'));
      },
    });
  }

  /**
   * Asks the server for every reason this cart could not check out — stock,
   * store minimum, age verification, dry days, sale windows, per-order caps.
   * Called again whenever the address changes, because most of those rules are
   * decided by where the order is going.
   */
  validate(): void {
    this.validating.set(true);

    this.shop.validateCheckout(this.selectedAddressId ?? undefined).subscribe({
      next: (res) => {
        this.validating.set(false);
        this.cart.set(res.data?.cart ?? null);
        this.blockers.set(res.data?.blockers ?? []);
        this.compliance.set(res.data?.compliance ?? null);
        this.ready.set(!!res.data?.ready);
      },
      error: (err) => {
        this.validating.set(false);
        this.ready.set(false);
        this.blockers.set([
          { code: 'VALIDATION_FAILED', message: CommonService.errorMessage(err) },
        ]);
      },
    });
  }

  chooseAddress(id: number): void {
    this.selectedAddressId = id;
    this.validate();
  }

  openAddressDialog(): void {
    this.addressForm.reset({ label: 'Home', isDefault: this.addresses().length === 0 });
    this.addressDialog.set(true);
  }

  invalid(control: string): boolean {
    const c = this.addressForm.get(control);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.savingAddress.set(true);
    this.shop.createAddress(this.addressForm.getRawValue()).subscribe({
      next: (res) => {
        this.savingAddress.set(false);
        this.addressDialog.set(false);
        this.addresses.update((list) => [res.data, ...list]);
        this.selectedAddressId = res.data.id;
        this.validate();
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

  placeOrder(): void {
    if (!this.ready() || this.placing()) return;

    this.placing.set(true);

    this.shop
      .checkout({
        deliveryAddressId: this.selectedAddressId ?? undefined,
        paymentMethod: this.paymentMethod,
        customerNotes: this.customerNotes.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          const order = res.data?.order ?? res.data;
          this.shop.resetCart();

          if (this.paymentMethod === 'CASH') {
            this.placing.set(false);
            this.toast.add({
              severity: 'success',
              summary: 'Order placed',
              detail: `${order.orderNumber} is confirmed.`,
              life: 4000,
            });
            this.router.navigate(['/orders', order.id]);
            return;
          }

          this.startOnlinePayment(order);
        },
        error: (err) => {
          this.placing.set(false);
          // Checkout failing is not a toast-and-forget: the reason is usually
          // actionable (stock moved, a dry day started), so re-validate to show
          // the current picture rather than leaving a stale "ready" state.
          this.toast.add({
            severity: 'error',
            summary: 'Order not placed',
            detail: CommonService.errorMessage(err),
            life: 8000,
          });
          this.validate();
        },
      });
  }

  /**
   * The order exists and is awaiting payment. We ask the API for an intent and
   * hand off to the provider's own checkout.
   *
   * When no provider is configured — as in a development environment running
   * the mock provider — there is no client-side handshake we can honestly
   * complete, so the customer is sent to the order, which shows what is owed and
   * lets them pay when the provider is available. Faking a success here would
   * mark an unpaid order paid.
   */
  private startOnlinePayment(order: any): void {
    this.shop.createPaymentIntent(order.id).subscribe({
      next: (res) => {
        this.placing.set(false);

        const intent = res.data;
        if (intent?.publicKey && (window as any).Razorpay) {
          this.openRazorpay(intent, order);
          return;
        }

        this.toast.add({
          severity: 'info',
          summary: 'Order placed — payment pending',
          detail:
            `${order.orderNumber} is reserved. Online payment is not available in this ` +
            'environment; the order page shows the amount due.',
          life: 9000,
        });
        this.router.navigate(['/orders', order.id]);
      },
      error: (err) => {
        this.placing.set(false);
        this.toast.add({
          severity: 'warn',
          summary: 'Order placed, payment not started',
          detail: CommonService.errorMessage(err),
          life: 8000,
        });
        this.router.navigate(['/orders', order.id]);
      },
    });
  }

  private openRazorpay(intent: any, order: any): void {
    const rzp = new (window as any).Razorpay({
      key: intent.publicKey,
      amount: Math.round(Number(intent.amount) * 100),
      currency: intent.currency || 'INR',
      name: 'Bottle Bee',
      description: order.orderNumber,
      order_id: intent.providerOrderId,
      handler: (response: any) => {
        // The signature is verified server-side; the client only relays it.
        this.shop
          .confirmPayment({
            providerOrderId: response.razorpay_order_id,
            providerPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Payment received', life: 4000 });
              this.router.navigate(['/orders', order.id]);
            },
            error: (err) => {
              this.toast.add({
                severity: 'error',
                summary: 'Payment could not be confirmed',
                detail: CommonService.errorMessage(err),
                life: 9000,
              });
              this.router.navigate(['/orders', order.id]);
            },
          });
      },
      modal: {
        ondismiss: () => this.router.navigate(['/orders', order.id]),
      },
    });

    rzp.open();
  }
}
