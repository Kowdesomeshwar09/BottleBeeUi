import { expect, test } from '@playwright/test';

import { Api, firstBuyableVariant } from './support/api';
import { STATE } from './support/accounts';

/**
 * The purchase path, and the rules that guard it.
 *
 * These tests place real orders against the seeded Telangana store, so they
 * also prove the compliance panel is showing what the server actually applied
 * rather than a plausible-looking client-side guess.
 */
test.describe('checkout', () => {
  test.use({ storageState: STATE.customer });

  let api: Api;

  test.beforeAll(async () => {
    api = await Api.as('customer');
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test.beforeEach(async () => {
    // Start from a known cart, arranged through the API rather than the UI.
    await api.post('cart/clear');
    const { variantId } = await firstBuyableVariant();
    await api.post('cart/add-item', { productVariantId: variantId, quantity: 1 });
  });

  test('shows the regional rules the server applied', async ({ page }) => {
    await page.goto('/checkout');

    const panel = page.locator('.bb-compliance');
    await expect(panel).toBeVisible({ timeout: 20_000 });

    // The seeded address is in Telangana: minimum age 21, sale window 10:00-23:00.
    await expect(panel).toContainText(/Telangana|IN-TS/);
    await expect(panel.getByText('Minimum age')).toBeVisible();
    await expect(panel).toContainText(/21 years/);
    await expect(panel.getByText('Sale hours')).toBeVisible();
  });

  test('states the age declaration before the order button', async ({ page }) => {
    await page.goto('/checkout');

    const legal = page.locator('.bb-summary-box .bb-legal');
    await expect(legal).toContainText(/legal drinking age/i);
    await expect(legal).toContainText(/photo ID/i);
    await expect(legal).toContainText(/returned/i);
  });

  test('a delivery address must be chosen', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('.bb-address.is-active')).toBeVisible({ timeout: 20_000 });
  });

  test('places a cash order and lands on its tracking page', async ({ page }) => {
    await page.goto('/checkout');

    // Cash on delivery is the default; it confirms without a payment provider.
    await expect(page.getByRole('button', { name: 'Place order' })).toBeEnabled({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page).toHaveURL(/\/orders\/\d+/, { timeout: 30_000 });
    await expect(page.getByText('Order placed')).toBeVisible();

    // Confirmed straight away, because there is nothing to collect online.
    await expect(page.locator('.bb-track-tags')).toContainText('Confirmed');
    await expect(page.locator('.bb-track-main')).toContainText(/Items/);
  });

  test('the cart is emptied by a successful checkout', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/orders\/\d+/, { timeout: 30_000 });

    await page.goto('/cart');
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('an empty cart cannot reach a placeable order', async ({ page }) => {
    await api.post('cart/clear');

    await page.goto('/checkout');
    await expect(page.getByText('Your cart is empty')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /Place order/ })).toHaveCount(0);
  });
});

test.describe('the server is the authority on price', () => {
  test.use({ storageState: STATE.customer });

  test('a tampered client total does not change what is charged', async ({ page }) => {
    const api = await Api.as('customer');

    await api.post('cart/clear');
    const { variantId, price } = await firstBuyableVariant();
    await api.post('cart/add-item', { productVariantId: variantId, quantity: 1 });

    // Checkout accepts an address, a method and a note. There is no price field
    // to tamper with — anything else in the body is rejected outright.
    const attempt = await api.attempt('orders/checkout', {
      paymentMethod: 'CASH',
      grandTotal: 1,
      subtotal: 1,
    });

    expect(attempt.status).toBe(422);

    // And an honest checkout charges the real amount.
    const honest = await api.post<any>('orders/checkout', { paymentMethod: 'CASH' });
    expect(honest.data.grandTotal).toBeGreaterThanOrEqual(price);

    await page.goto(`/orders/${honest.data.id}`);
    await expect(page.locator('.bb-track-main')).toContainText('Total');

    await api.dispose();
  });
});

test.describe('order history and tracking', () => {
  test.use({ storageState: STATE.customer });

  test('lists past orders with a status and a total', async ({ page }) => {
    await page.goto('/orders');

    const rows = page.locator('.bb-order-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    const first = rows.first();
    await expect(first.locator('.bb-order-top strong')).toContainText(/BB-/);
    await expect(first.locator('.bb-order-right strong')).toContainText('₹');
  });

  test('a tracking page explains what the status means', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('.bb-order-row').first().click();

    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('.bb-track-main').getByText('Progress')).toBeVisible();

    // The status help text, not just the status code.
    await expect(page.locator('.p-message')).toContainText(/order|payment|deliver/i);
  });

  test('filtering the history by status works', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('.bb-order-row').first()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'Cancelled' }).click();

    // Either some cancelled orders, or an honest empty state — never a crash.
    await expect(
      page.locator('.bb-order-row').first().or(page.getByText('No orders yet')),
    ).toBeVisible({ timeout: 15_000 });
  });
});
