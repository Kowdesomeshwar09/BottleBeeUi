import { Page, expect } from '@playwright/test';

/**
 * The seeded accounts. These come from `seeders/20250101010400-sample-marketplace.js`
 * and the super-admin seeder, so a suite run needs `npm run db:seed` in the API
 * first. Passwords are seed values for a development database, not secrets.
 */
export const ACCOUNTS = {
  customer: { email: 'customer@bottlebee.test', password: 'Bottle@Bee123' },
  vendor: { email: 'owner@jubileewines.test', password: 'Bottle@Bee123' },
  rider: { email: 'rider@bottlebee.test', password: 'Bottle@Bee123' },
  admin: {
    email: process.env['E2E_ADMIN_EMAIL'] || 'admin@bottlebee.in',
    password: process.env['E2E_ADMIN_PASSWORD'] || 'ChangeMe@12345',
  },
} as const;

export type AccountName = keyof typeof ACCOUNTS;

/** Where `auth.setup.ts` saves each role's session. */
export const STATE: Record<AccountName, string> = {
  customer: 'e2e/.auth/customer.json',
  vendor: 'e2e/.auth/vendor.json',
  admin: 'e2e/.auth/admin.json',
  rider: 'e2e/.auth/rider.json',
};

/** An explicitly signed-out context, for the tests about being anonymous. */
export const ANONYMOUS = { cookies: [], origins: [] };

/**
 * Signs in through the actual form.
 *
 * Reserved for the tests that are about signing in. Everything else starts from
 * a saved session, because the API rate-limits authentication to ten attempts
 * per fifteen minutes per email — correct behaviour that a suite logging in on
 * every test walks straight into.
 */
export async function signIn(page: Page, account: AccountName): Promise<void> {
  const { email, password } = ACCOUNTS[account];

  await page.goto('/login');
  // Located by label rather than placeholder: PrimeNG mirrors `placeholder`
  // onto the p-password host as well as the inner input, so a placeholder
  // locator matches twice. Labels also assert the accessibility wiring.
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // The landing route differs by role, so wait for the login form to go rather
  // than for any one URL.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden({ timeout: 20_000 });
}

export async function signOut(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('bb_access_token');
    localStorage.removeItem('bb_refresh_token');
    localStorage.removeItem('bb_user');
  });
}
