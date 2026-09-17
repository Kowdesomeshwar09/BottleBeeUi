import { Browser, Page, expect, test } from '@playwright/test';

import { Api, seedBuyableCart } from './support/api';
import { STATE } from './support/accounts';

/**
 * One order, carried from a store shelf to a doorstep by the people who do it.
 *
 * WHY THIS IS ONE TEST AND NOT SIX
 *
 * The obvious shape is a describe per role, each with `test.use({ storageState })`
 * and the order created in a shared `beforeAll`. That does not work: changing
 * `storageState` starts a new Playwright worker, and `beforeAll` runs once per
 * worker — so every role group quietly checked out its *own* order, and the
 * rider then looked for an assignment against an order dispatch had never seen.
 *
 * A cross-role journey is inherently one sequence over one order, so it is
 * written as one: each role gets its own browser context explicitly, and the
 * steps run in the order the real workflow does. The `step` calls keep the
 * report readable, and a failure names the stage it happened in.
 */
test.describe('fulfilment, end to end', () => {
  test.describe.configure({ timeout: 180_000 });

  /** A page authenticated as one role. */
  const pageAs = async (browser: Browser, state: string): Promise<Page> => {
    const context = await browser.newContext({ storageState: state });
    return context.newPage();
  };

  test('an order travels from checkout to a verified handover', async ({ browser }) => {
    const customerApi = await Api.as('customer');
    const vendorApi = await Api.as('vendor');
    const riderApi = await Api.as('rider');

    let orderId = 0;
    let orderNumber = '';
    let assignmentId = 0;

    try {
      await test.step('the customer places an order the store will accept', async () => {
        // Enough to clear the store's minimum order value; see seedBuyableCart.
        await seedBuyableCart(customerApi);

        const order = await customerApi.post<any>('orders/checkout', {
          paymentMethod: 'CASH',
          customerNotes: 'E2E fulfilment run',
        });

        orderId = order.data.id;
        orderNumber = order.data.orderNumber;
        expect(orderNumber).toMatch(/^BB-/);
      });

      await test.step('the store sees it and starts packing', async () => {
        const page = await pageAs(browser, STATE.vendor);

        await page.goto('/vendor/orders');
        const row = page.getByRole('row').filter({ hasText: orderNumber });
        await expect(row).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.bb-stats')).toContainText('Orders');

        await row.getByRole('button', { name: 'Start packing' }).click();
        await expect(page.getByText(/Preparing/).first()).toBeVisible({ timeout: 15_000 });

        await page.context().close();
      });

      await test.step('dispatch assigns a rider to the packed order', async () => {
        // Arrange the hand-off rather than re-driving the vendor UI for it.
        await vendorApi.post('orders/update-status', { id: orderId, status: 'READY_FOR_PICKUP' });

        const page = await pageAs(browser, STATE.admin);

        await page.goto('/admin/orders');
        const row = page.getByRole('row').filter({ hasText: orderNumber });
        await expect(row).toBeVisible({ timeout: 20_000 });

        await row.getByRole('button', { name: 'Assign rider' }).click();

        // Everything after this is scoped to the dialog: the table behind it
        // has its own Assign buttons, and the dialog's own title would match a
        // bare "Delivery partner" label lookup.
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('combobox', { name: 'Delivery partner' }).click();
        const option = page.getByRole('option').first();
        await expect(option).toBeVisible({ timeout: 15_000 });
        await option.click();

        // Not `exact`: PrimeNG's computed accessible name for a button with an
        // icon is not the bare label, so an exact match finds nothing. Scoping
        // to the dialog is what disambiguates it from the table's own buttons.
        await dialog.getByRole('button', { name: 'Assign' }).click();
        await expect(page.locator('.p-toast')).toContainText('Rider assigned', {
          timeout: 20_000,
        });

        await page.context().close();
      });

      await test.step('the rider sees the run, with the address and the ID state', async () => {
        const runs = await riderApi.post<any>('delivery/list', { limit: 30 });
        const run = (runs.data as any[]).find((r) => r.order?.orderNumber === orderNumber);
        expect(run, `no assignment found for ${orderNumber}`).toBeTruthy();
        assignmentId = run.id;

        const page = await pageAs(browser, STATE.rider);

        await page.goto('/delivery/my-deliveries');
        const card = page.locator('.bb-run').filter({ hasText: orderNumber });
        await expect(card).toBeVisible({ timeout: 20_000 });
        await expect(card.locator('address')).not.toBeEmpty();
        await expect(card).toContainText(/ID not checked/);

        await page.context().close();
      });

      await test.step('the handover is refused until the recipient is checked', async () => {
        await riderApi.post('delivery/respond', { id: assignmentId, accept: true });
        await riderApi.post('delivery/advance', { id: assignmentId, status: 'PICKED_UP' });
        await riderApi.post('delivery/advance', { id: assignmentId, status: 'IN_TRANSIT' });

        // The server refuses completion outright.
        const refused = await riderApi.attempt('delivery/complete', { id: assignmentId });
        expect(refused.status).toBe(403);

        // And the screen leads with why, rather than offering a button that fails.
        const page = await pageAs(browser, STATE.rider);
        await page.goto(`/delivery/my-deliveries/${assignmentId}`);

        const gate = page.locator('.bb-gate');
        await expect(gate).toBeVisible({ timeout: 20_000 });
        await expect(gate).toContainText(/below the legal drinking age/i);
        await expect(gate).toContainText(/mark this run failed/i);
        await expect(page.getByRole('button', { name: 'Handed over — complete' })).toHaveCount(0);

        await page.context().close();
      });

      await test.step('recording the ID check unlocks completion', async () => {
        const page = await pageAs(browser, STATE.rider);
        await page.goto(`/delivery/my-deliveries/${assignmentId}`);

        await page.getByRole('button', { name: 'I have checked their ID' }).click();
        await expect(page.getByText('Which document did you check?')).toBeVisible();
        await page.getByRole('button', { name: 'ID checked and valid' }).click();
        await expect(page.locator('.p-toast')).toContainText('ID recorded', { timeout: 20_000 });

        await page.getByRole('button', { name: 'Handed over — complete' }).click();
        await expect(page.locator('.p-toast')).toContainText('Delivered', { timeout: 20_000 });

        await page.context().close();
      });

      await test.step('the customer sees it delivered, with the ID check recorded', async () => {
        const page = await pageAs(browser, STATE.customer);
        await page.goto(`/orders/${orderId}`);

        await expect(page.locator('.bb-track-tags')).toContainText('Delivered', { timeout: 20_000 });
        await expect(page.locator('.bb-track-side').getByText('ID checked')).toBeVisible();

        const timeline = page.locator('.bb-track-main');
        await expect(timeline).toContainText('Confirmed');
        await expect(timeline).toContainText('Delivered');

        // A delivered order can be reviewed.
        await expect(page.getByRole('button', { name: 'Rate this order' })).toBeVisible();

        await page.context().close();
      });
    } finally {
      await Promise.all([customerApi.dispose(), vendorApi.dispose(), riderApi.dispose()]);
    }
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
