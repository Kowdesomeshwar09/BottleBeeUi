/**
 * Status vocabulary shared by every screen that shows one.
 *
 * The API is the authority on which statuses exist; this file only decides how
 * each one looks and reads. Keeping it in one place means an order marked
 * CANCELLED looks the same in the customer's history, the vendor's queue and
 * the admin console — three screens that would otherwise drift apart.
 *
 * The keys mirror `config/constants.js` on the server. A status absent from a
 * table falls through to `secondary` rather than throwing, so a new server-side
 * value degrades to a plain grey chip instead of breaking the screen.
 */

export type Tone = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

const ORDER_TONES: Record<string, Tone> = {
  PLACED: 'info',
  PAYMENT_PENDING: 'warn',
  PAYMENT_FAILED: 'danger',
  CONFIRMED: 'info',
  PREPARING: 'info',
  READY_FOR_PICKUP: 'info',
  ASSIGNED: 'info',
  PICKED_UP: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'secondary',
};

const PAYMENT_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  AUTHORIZED: 'info',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'secondary',
  PARTIALLY_REFUNDED: 'secondary',
};

const DELIVERY_TONES: Record<string, Tone> = {
  PENDING: 'secondary',
  ASSIGNED: 'warn',
  ACCEPTED: 'info',
  REJECTED: 'danger',
  PICKED_UP: 'info',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  FAILED: 'danger',
  CANCELLED: 'danger',
};

const REVIEW_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  PENDING_APPROVAL: 'warn',
  SUBMITTED: 'warn',
  UNDER_REVIEW: 'warn',
  APPROVED: 'success',
  VERIFIED: 'success',
  ACTIVE: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  EXPIRED: 'danger',
  DRAFT: 'secondary',
  INACTIVE: 'secondary',
  OFFLINE: 'secondary',
  NOT_SUBMITTED: 'secondary',
  ARCHIVED: 'secondary',
};

/** Turns any status into a PrimeNG tag severity. */
export function toneFor(
  status: string | null | undefined,
  kind: 'order' | 'payment' | 'delivery' | 'review' = 'review',
): Tone {
  if (!status) return 'secondary';

  const table =
    kind === 'order' ? ORDER_TONES
      : kind === 'payment' ? PAYMENT_TONES
        : kind === 'delivery' ? DELIVERY_TONES
          : REVIEW_TONES;

  return table[status] ?? REVIEW_TONES[status] ?? 'secondary';
}

/** PAYMENT_PENDING -> "Payment pending". */
export function humanise(value: string | null | undefined): string {
  if (!value) return '—';
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** What a customer should understand a status to mean, in plain words. */
export const ORDER_STATUS_HELP: Record<string, string> = {
  PLACED: 'We have your order and are waiting for the store to confirm it.',
  PAYMENT_PENDING: 'We are holding your items. Complete payment to confirm the order.',
  PAYMENT_FAILED: 'The payment did not go through. Nothing has been charged.',
  CONFIRMED: 'The store has your order and will start packing it shortly.',
  PREPARING: 'The store is packing your order.',
  READY_FOR_PICKUP: 'Packed and waiting for a delivery partner.',
  ASSIGNED: 'A delivery partner has been assigned and is heading to the store.',
  PICKED_UP: 'Your order has left the store.',
  OUT_FOR_DELIVERY: 'On the way. Please keep a valid photo ID ready.',
  DELIVERED: 'Delivered. Thanks for ordering.',
  CANCELLED: 'This order was cancelled. Any payment is refunded to the original method.',
  REFUNDED: 'Refunded to the original payment method.',
};

/** The customer-facing journey, in order, for a progress indicator. */
export const ORDER_JOURNEY = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];
