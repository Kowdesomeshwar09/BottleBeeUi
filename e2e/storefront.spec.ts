import { expect, test } from '@playwright/test';

import { Api, firstBuyableVariant, seedBuyableCart } from './support/api';
import { ANONYMOUS, STATE } from './support/accounts';

test.describe('the storefront', () => {
  test.use({ storageState: ANONYMOUS });

  test('lists products with a price and a store', async ({ page }) => {
    await page.goto('/shop');

    const cards = page.locator('.bb-product');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    const first = cards.first();
    await expect(first.locator('.bb-product-name')).not.toBeEmpty();
    await expect(first.locator('.bb-product-price strong')).toContainText('₹');
    await expect(first.locator('.bb-vendor')).toContainText(/Sold by/);
  });

  test('says how many products matched', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('.bb-result-count')).toContainText(/\d+ products?/);
  });

  test('a search that matches nothing says so, and offers a way out', async ({ page }) => {
    await page.goto('/shop');
    await page.getByLabel('Search products').fill('zzzzz-no-such-bottle-zzzzz');

    await expect(page.getByText('Nothing matched that')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator('.bb-product').first()).toBeVisible();
  });

  test('filtering by type narrows the list', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('.bb-product').first()).toBeVisible();

    const before = await page.locator('.bb-result-count').textContent();

    await page.getByLabel('Type').click();
    await page.getByRole('option').first().click();

    await expect(page.locator('.bb-result-count')).not.toHaveText(before || '', {
      timeout: 15_000,
    });
  });

  test('a product page shows strength, sizes and the legal notice', async ({ page }) => {
    const { productSlug, productName } = await firstBuyableVariant();

    await page.goto(`/shop/product/${productSlug}`);

    await expect(page.getByRole('heading', { name: productName, level: 1 })).toBeVisible();
    await expect(page.locator('.bb-variant').first()).toBeVisible();
    await expect(page.locator('.bb-price-block strong')).toContainText('₹');
    // Scoped to the buy panel: the footer carries a .bb-legal notice too.
    await expect(page.locator('.bb-buy .bb-legal')).toContainText(/photo ID/i);
  });

  test('an unknown product slug does not render a broken page', async ({ page }) => {
    await page.goto('/shop/product/no-such-product-slug');
    await expect(page.getByText("That didn't load")).toBeVisible();
  });
});

test.describe('the age gate on the storefront', () => {
  test.use({ storageState: ANONYMOUS });

  test('an anonymous add-to-cart is sent to sign in first', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('.bb-product').first()).toBeVisible();

    await page
      .locator('.bb-product')
      .first()
      .getByRole('button', { name: 'Add to cart' })
      .click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('the footer states the platform is not the seller', async ({ page }) => {
    await page.goto('/shop');
    const footer = page.locator('.bb-footer');

    await expect(footer).toContainText(/technology platform/i);
    await expect(footer).toContainText(/licensed retailers/i);
    await expect(footer).toContainText(/legal drinking age/i);
  });
});

test.describe('the cart', () => {
  test.use({ storageState: STATE.customer });

  let api: Api;

  test.beforeAll(async () => {
    api = await Api.as('customer');
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  // One customer is shared by these tests, so each starts from an empty cart.
  // Otherwise "remove the only item" leaves yesterday's row behind.
  test.beforeEach(async () => {
    await api.post('cart/clear');
  });

  test('an item can be added, its quantity changed, and removed', async ({ page }) => {
    const { productSlug } = await firstBuyableVariant();

    await page.goto(`/shop/product/${productSlug}`);
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText('Added to cart')).toBeVisible();

    await page.goto('/cart');
    const row = page.locator('.bb-cart-row').first();
    await expect(row).toBeVisible();

    const quantity = row.locator('.bb-cart-qty span');
    await expect(quantity).toHaveText('1');

    await row.getByLabel('Increase quantity').click();
    await expect(quantity).toHaveText('2');

    await row.getByLabel('Reduce quantity').click();
    await expect(quantity).toHaveText('1');

    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('the header badge tracks what is in the cart', async ({ page }) => {
    const { productSlug } = await firstBuyableVariant();

    await page.goto(`/shop/product/${productSlug}`);
    await page.getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.locator('.bb-cart-count')).toHaveText('1');
  });

  test('totals are shown itemised, with the tax line', async ({ page }) => {
    await seedBuyableCart(api);

    await page.goto('/cart');
    const summary = page.locator('.bb-summary-box');

    // Matched on the definition terms: the free-delivery hint also says
    // "delivery", so a loose text match resolves to two elements.
    await expect(summary.locator('dt', { hasText: /^Subtotal$/ })).toBeVisible();
    await expect(summary.locator('dt', { hasText: /^Tax$/ })).toBeVisible();
    await expect(summary.locator('dt', { hasText: /^Delivery$/ })).toBeVisible();
    await expect(summary.locator('.bb-total strong')).toContainText('₹');
  });

  test('an invalid coupon is reported rather than silently ignored', async ({ page }) => {
    await seedBuyableCart(api);

    await page.goto('/cart');
    await page.getByLabel('Coupon code').fill('NOT-A-REAL-COUPON');

    // Scoped to the entry box: every offer in the list has its own Apply.
    await page.locator('.bb-coupon-entry').getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText('Coupon not applied')).toBeVisible();
  });
});
