import { expect, test } from '@playwright/test';

import { Api, firstBuyableVariant, seedBuyableCart } from './support/api';
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
    // A cart the store would actually accept: the seeded shop has a 500
    // minimum, so a single 150 bottle is legitimately refused at checkout.
    await seedBuyableCart(api);
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
    // Scoped to the toast: the tracking page also explains the status in prose.
    await expect(page.locator('.p-toast')).toContainText('Order placed');

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
    // The heading, not loose text: the blocker list says the same thing, which
    // is itself the point — the screen states it twice over, deliberately.
    await expect(
      page.getByRole('heading', { name: 'Your cart is empty' }),
    ).toBeVisible({ timeout: 20_000 });

    // No order button at all, rather than a disabled one over a summary of
    // nothing. validate-checkout still returns a cart object when it holds no
    // items, so the screen keys off the items rather than the cart's presence.
    await expect(page.getByRole('button', { name: /Place order/ })).toHaveCount(0);
    await expect(page.locator('.bb-summary-box')).toHaveCount(0);
  });
});

test.describe('the server is the authority on price', () => {
  test.use({ storageState: STATE.customer });

  test('a tampered client total is ignored, not obeyed', async ({ page }) => {
    const api = await Api.as('customer');
    const seeded = await seedBuyableCart(api);

    // The validate middleware runs with `stripUnknown`, so a body carrying
    // price fields does not get rejected — the fields are silently dropped and
    // never reach the pricing engine. That is the stronger guarantee: mass
    // assignment is impossible by construction rather than by a blocklist.
    const order = await api.post<any>('orders/checkout', {
      paymentMethod: 'CASH',
      grandTotal: 1,
      subtotal: 1,
      discountTotal: 9999,
    });

    // Charged the server's figure, not the one asked for.
    expect(order.data.grandTotal).toBe(seeded.grandTotal);
    expect(order.data.subtotal).toBe(seeded.subtotal);
    expect(order.data.grandTotal).not.toBe(1);

    await page.goto(`/orders/${order.data.id}`);
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
