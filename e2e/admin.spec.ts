import { expect, test } from '@playwright/test';

import { Api, seedBuyableCart } from './support/api';
import { STATE } from './support/accounts';

test.describe('the admin dashboard', () => {
  test.use({ storageState: STATE.admin });

  test('leads with what is waiting on a human', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect(page.getByText('Waiting on you')).toBeVisible({ timeout: 20_000 });

    // Either a queue, or an explicit statement that there is none — not a blank.
    await expect(
      page.locator('.bb-queue-item').first().or(page.getByText('Nothing in the queue')),
    ).toBeVisible();
  });

  test('shows trading figures for the chosen window', async ({ page }) => {
    await page.goto('/admin/dashboard');

    const stats = page.locator('.bb-stats');
    await expect(stats).toContainText('Orders');
    await expect(stats).toContainText('Revenue');
    await expect(stats).toContainText('Average order');
  });

  test('changing the window reloads the figures', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('.bb-stats')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: '7 days' }).click();
    await expect(page.locator('.bb-ad-head')).toContainText(/\d/, { timeout: 15_000 });
    await expect(page.locator('.bb-stats')).toBeVisible();
  });

  test('the platform panel reports the verification rate', async ({ page }) => {
    await page.goto('/admin/dashboard');

    const platform = page.locator('.bb-panel').filter({ hasText: 'Platform' });
    await expect(platform).toContainText('Age verified');
    await expect(platform).toContainText('Stores approved');
    await expect(platform).toContainText('Riders active');
  });
});

test.describe('store and licence review', () => {
  test.use({ storageState: STATE.admin });

  test('states the rule linking the two', async ({ page }) => {
    await page.goto('/admin/vendors');

    await expect(page.getByRole('heading', { name: 'Stores and licences' })).toBeVisible();
    await expect(page.locator('.bb-page-subtitle')).toContainText(
      /cannot be approved until one of its excise licences/i,
    );
  });

  test('has a tab for each side of the decision', async ({ page }) => {
    await page.goto('/admin/vendors');

    await expect(page.getByRole('tab', { name: /Stores/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Licences/ })).toBeVisible();

    await page.getByRole('tab', { name: /Licences/ }).click();
    await expect(
      page.locator('.bb-table').or(page.getByText('No licences here')),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('an approved store can be opened and read', async ({ page }) => {
    await page.goto('/admin/vendors');

    await page.getByLabel('Filter stores by status').click();
    await page.getByRole('option', { name: 'Approved' }).click();

    const link = page.locator('.bb-table .bb-link-btn').first();
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();

    // Scoped to the dialog: the table behind it has a Commission column too.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Legal name')).toBeVisible();
    await expect(dialog.getByText('Commission')).toBeVisible();
    await expect(dialog.getByText('Minimum order')).toBeVisible();
  });
});

test.describe('age verification review', () => {
  test.use({ storageState: STATE.admin });

  test('says why the queue matters', async ({ page }) => {
    await page.goto('/admin/age-verifications');

    await expect(page.getByRole('heading', { name: 'Age verification' })).toBeVisible();
    await expect(page.locator('.bb-page-subtitle')).toContainText(
      /cannot order until it is reviewed/i,
    );
    await expect(page.locator('.bb-page-subtitle')).toContainText(/recorded against your account/i);
  });

  test('shows the computed age, not just the date of birth', async ({ page }) => {
    await page.goto('/admin/age-verifications');

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'All' }).click();

    const table = page.locator('.bb-table');
    await expect(table.or(page.getByText('Queue is clear'))).toBeVisible({ timeout: 20_000 });

    if (await table.isVisible().catch(() => false)) {
      await expect(table).toContainText('Date of birth');
      await expect(table).toContainText('Age');
    }
  });
});

test.describe('product approval', () => {
  test.use({ storageState: STATE.admin });

  test('explains what the reviewer is checking', async ({ page }) => {
    await page.goto('/admin/products');

    await expect(page.getByRole('heading', { name: 'Product approvals' })).toBeVisible();
    await expect(page.locator('.bb-page-subtitle')).toContainText(
      /describe what is actually in the bottle/i,
    );
  });

  test('lists live products with their strength', async ({ page }) => {
    await page.goto('/admin/products');

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'Live' }).click();

    const table = page.locator('.bb-table');
    await expect(table).toBeVisible({ timeout: 20_000 });
    await expect(table).toContainText('ABV');
    await expect(table).toContainText('Store');
  });
});

test.describe('all orders', () => {
  test.use({ storageState: STATE.admin });

  // Places one order first. On a freshly seeded database there are none, and a
  // test that merely tolerated the empty state would assert nothing about the
  // columns it exists to check.
  test.beforeAll(async () => {
    const customer = await Api.as('customer');
    try {
      await seedBuyableCart(customer);
      await customer.post('orders/checkout', { paymentMethod: 'CASH' });
    } finally {
      await customer.dispose();
    }
  });

  test('shows every store, with the delivery state', async ({ page }) => {
    await page.goto('/admin/orders');

    await page.getByLabel('Filter by status').click();
    await page.getByRole('option', { name: 'All' }).click();

    const table = page.locator('.bb-table');
    await expect(table).toBeVisible({ timeout: 20_000 });
    await expect(table).toContainText('Store');
    await expect(table).toContainText('Region');
    await expect(table).toContainText('Delivery');

    // And the order really is listed, not just the header.
    await expect(page.locator('.bb-table tbody tr').first()).toBeVisible();
  });
});
