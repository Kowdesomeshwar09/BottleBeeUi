import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Rupees, in Indian digit grouping (₹1,20,000.00 rather than ₹120,000.00).
 *
 * The API sends amounts as numbers already rounded to two places by the pricing
 * engine, so this only formats — it never rounds, and a total shown here is the
 * total that was charged.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';

    const amount = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(amount)) return '—';

    return FORMATTER.format(amount);
  }
}
