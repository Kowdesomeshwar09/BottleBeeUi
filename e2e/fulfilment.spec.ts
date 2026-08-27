import { expect, test } from '@playwright/test';

import { Api, firstBuyableVariant } from './support/api';
import { STATE } from './support/accounts';

/**
 * One order, carried from a store shelf to a doorstep by the people who
 * actually do it.
 *
 * Each role's screen is asserted at the point the order becomes that role's
 * problem, which is why the tests are grouped by role — each group runs with
 * that role's saved session. The hand-offs between roles are arranged through
 * the API, so a failure in one role's UI cannot cascade into the next.
 *
 * These tests share one order and must run in order. The config pins a single
 * worker with parallelism off for exactly this reason.
 */
test.describe('fulfilment, end to end', () => {
  let customerApi: Api;
  let vendorApi: Api;
  let riderApi: Api;
  let orderId: number;
  let orderNumber: string;

  test.beforeAll(async () => {
    customerApi = await Api.as('customer');
    vendorApi = await Api.as('vendor');
    riderApi = await Api.as('rider');

    await customerApi.post('cart/clear');
    const { variantId } = await firstBuyableVariant();
    await customerApi.post('cart/add-item', { productVariantId: variantId, quantity: 1 });

    const order = await customerApi.post<any>('orders/checkout', {
      paymentMethod: 'CASH',
      customerNotes: 'E2E fulfilment run',
    });

    orderId = order.data.id;
    orderNumber = order.data.orderNumber;
  });

  test.afterAll(async () => {
    await Promise.all([customerApi.dispose(), vendorApi.dispose(), riderApi.dispose()]);
  });

  /* ------------------------------- the store ------------------------------ */

  test.describe('the store', () => {
    test.use({ storageState: STATE.vendor });

    test('sees the new order in its queue', async ({ page }) => {
      await page.goto('/vendor/orders');

      await expect(page.getByRole('cell', { name: orderNumber })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('.bb-stats')).toContainText('Orders');
    });

    test('can move it to packing', async ({ page }) => {
      await page.goto('/vendor/orders');

      const row = page.getByRole('row').filter({ hasText: orderNumber });
      await expect(row).toBeVisible({ timeout: 20_000 });
      await row.getByRole('button', { name: 'Start packing' }).click();

      await expect(page.getByText(/Preparing/).first()).toBeVisible({ timeout: 15_000 });
    });
  });

  /* -------------------------------- dispatch ------------------------------ */

  test.describe('dispatch', () => {
    test.use({ storageState: STATE.admin });

    test('sees the packed order and can assign a rider', async ({ page }) => {
      // Arrange the hand-off rather than re-driving the vendor UI.
      await vendorApi.post('orders/update-status', { id: orderId, status: 'READY_FOR_PICKUP' });

      await page.goto('/admin/orders');

      const row = page.getByRole('row').filter({ hasText: orderNumber });
      await expect(row).toBeVisible({ timeout: 20_000 });

      await row.getByRole('button', { name: 'Assign rider' }).click();
      await expect(page.getByText('Assign a delivery partner')).toBeVisible();

      // Only active partners are offered.
      await page.getByLabel('Delivery partner').click();
      const option = page.getByRole('option').first();
      await expect(option).toBeVisible();
      await option.click();

      await page.getByRole('button', { name: 'Assign', exact: true }).click();
      await expect(page.getByText('Rider assigned')).toBeVisible({ timeout: 20_000 });
    });
  });

  /* -------------------------------- the rider ----------------------------- */

  test.describe('the rider', () => {
    test.use({ storageState: STATE.rider });

    /** The assignment for this run, looked up rather than assumed. */
    const findRun = async () => {
      const runs = await riderApi.post<any>('delivery/list', { limit: 20 });
      const run = (runs.data as any[]).find((r) => r.order?.orderNumber === orderNumber);
      expect(run, `no assignment found for ${orderNumber}`).toBeTruthy();
      return run;
    };

    test('sees the run and the address', async ({ page }) => {
      await page.goto('/delivery/my-deliveries');

      const run = page.locator('.bb-run').filter({ hasText: orderNumber });
      await expect(run).toBeVisible({ timeout: 20_000 });
      await expect(run.locator('address')).not.toBeEmpty();
      await expect(run).toContainText(/ID not checked/);
    });

    test('cannot complete the run before checking the recipient', async ({ page }) => {
      const run = await findRun();

      // Get the order to the doorstep.
      if (run.status === 'ASSIGNED') {
        await riderApi.post('delivery/respond', { id: run.id, accept: true });
      }
      await riderApi.post('delivery/advance', { id: run.id, status: 'PICKED_UP' });
      await riderApi.post('delivery/advance', { id: run.id, status: 'IN_TRANSIT' });

      // The server refuses completion until the recipient has been checked.
      const refused = await riderApi.attempt('delivery/complete', { id: run.id });
      expect(refused.status).toBe(403);

      // And the screen leads with that, rather than offering a button that fails.
      await page.goto(`/delivery/my-deliveries/${run.id}`);

      const gate = page.locator('.bb-gate');
      await expect(gate).toBeVisible({ timeout: 20_000 });
      await expect(gate).toContainText(/below the legal drinking age/i);
      await expect(gate).toContainText(/mark this run failed/i);
      await expect(page.getByRole('button', { name: 'Handed over — complete' })).toHaveCount(0);
    });

    test('recording the ID check unlocks completion, and delivers it', async ({ page }) => {
      const run = await findRun();

      await page.goto(`/delivery/my-deliveries/${run.id}`);

      await page.getByRole('button', { name: 'I have checked their ID' }).click();
      await expect(page.getByText('Which document did you check?')).toBeVisible();
      await page.getByRole('button', { name: 'ID checked and valid' }).click();

      await expect(page.getByText('ID recorded')).toBeVisible({ timeout: 20_000 });

      await page.getByRole('button', { name: 'Handed over — complete' }).click();
      await expect(page.getByText('Delivered').first()).toBeVisible({ timeout: 20_000 });
    });
  });

  /* ------------------------------ the customer ---------------------------- */

  test.describe('the customer', () => {
    test.use({ storageState: STATE.customer });

    test('sees it delivered, with the ID check recorded', async ({ page }) => {
      await page.goto(`/orders/${orderId}`);

      await expect(page.locator('.bb-track-tags')).toContainText('Delivered', { timeout: 20_000 });
      await expect(page.locator('.bb-track-side').getByText('ID checked')).toBeVisible();

      // The whole journey is on the timeline.
      const timeline = page.locator('.bb-track-main');
      await expect(timeline).toContainText('Confirmed');
      await expect(timeline).toContainText('Delivered');

      // And a delivered order can be reviewed.
      await expect(page.getByRole('button', { name: 'Rate this order' })).toBeVisible();
    });
  });
});

test.describe('stock', () => {
  test.use({ storageState: STATE.vendor });

  test('the store sees reserved units apart from available ones', async ({ page }) => {
    await page.goto('/vendor/inventory');

    const stats = page.locator('.bb-stats');
    await expect(stats).toBeVisible({ timeout: 20_000 });
    await expect(stats).toContainText('Units available');
    await expect(stats).toContainText('Units reserved');

    const table = page.locator('.bb-table');
    await expect(table).toContainText('Available');
    await expect(table).toContainText('Reserved');
  });

  test('an adjustment says what the shelf will read afterwards', async ({ page }) => {
    await page.goto('/vendor/inventory');

    await page.locator('.bb-table').getByRole('button', { name: 'Adjust' }).first().click();
    await expect(page.getByText('On the shelf now')).toBeVisible();

    await expect(page.locator('.p-message')).toContainText(/The shelf will read \d+ after this/);
  });
});
