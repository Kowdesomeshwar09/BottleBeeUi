import { expect, test } from '@playwright/test';

import { ACCOUNTS, ANONYMOUS, STATE, signIn, signOut } from './support/accounts';

test.describe('signing in', () => {
  // Real form submissions, so these start signed out.
  test.use({ storageState: ANONYMOUS });

  test('a customer lands on the shop', async ({ page }) => {
    await signIn(page, 'customer');
    await expect(page).toHaveURL(/\/shop/);
    await expect(page.getByRole('heading', { name: 'Shop', level: 1 })).toBeVisible();
  });

  test('an admin lands on the dashboard, not the shop', async ({ page }) => {
    await signIn(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('a rider lands on their runs', async ({ page }) => {
    await signIn(page, 'rider');
    await expect(page).toHaveURL(/\/delivery\/my-deliveries/);
  });

  test('a vendor lands on store orders', async ({ page }) => {
    await signIn(page, 'vendor');
    await expect(page).toHaveURL(/\/vendor\/orders/);
  });

  test('a wrong password is reported, not swallowed', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert').or(page.locator('.p-message-error'))).toContainText(
      /incorrect|invalid|could not/i,
    );
    // Still on the login page, with nothing stored.
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('bb_access_token'))).toBeNull();
  });

  test('a malformed email is caught before a request goes out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('anything');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });
});

test.describe('route protection, signed out', () => {
  test.use({ storageState: ANONYMOUS });

  test('an anonymous visitor can browse but not check out', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'Shop', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcheckout/);
  });

  test('the guard returns you to where you were headed', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/returnUrl=%2Forders/);

    await page.getByLabel('Email', { exact: true }).fill(ACCOUNTS.customer.email);
    await page.getByLabel('Password', { exact: true }).fill(ACCOUNTS.customer.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/orders/);
  });

  test('an unknown route shows not-found', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText('That page does not exist')).toBeVisible();
  });
});

test.describe('route protection, as a customer', () => {
  test.use({ storageState: STATE.customer });

  test('a customer is refused the admin console', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/no-access/);
    await expect(page.getByText('You do not have access to that')).toBeVisible();
  });

  test('a customer is refused the vendor area', async ({ page }) => {
    await page.goto('/vendor/inventory');
    await expect(page).toHaveURL(/\/no-access/);
  });

  test('a signed-in user is kept off the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/shop/);
  });
});

test.describe('signing out', () => {
  test.use({ storageState: STATE.customer });

  test('clears the session and returns to login', async ({ page }) => {
    await page.goto('/shop');

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('bb_access_token'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('bb_user'))).toBeNull();
  });

  test('a cleared token sends the next protected view to login', async ({ page }) => {
    await page.goto('/shop');
    await signOut(page);

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });
});
