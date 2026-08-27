import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, request, test as setup } from '@playwright/test';

import { ACCOUNTS, AccountName, STATE } from './support/accounts';

const API = process.env['E2E_API_URL'] || 'http://localhost:5000/api/v1/';
const APP = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

/**
 * Signs in once per role and saves the session for the rest of the suite.
 *
 * The API rate-limits authentication to ten attempts per fifteen minutes per
 * email — correct behaviour that a suite logging in on every test walks
 * straight into. Signing in once here, through the API rather than the form,
 * costs one request per role and leaves the limiter alone for the tests that
 * are genuinely about the login screen.
 *
 * The saved state is the same three localStorage keys the app itself writes, so
 * a test starting from it is indistinguishable from a user who signed in.
 */
async function saveSession(account: AccountName) {
  const { email, password } = ACCOUNTS[account];
  const ctx = await request.newContext({ baseURL: API });

  const res = await ctx.post('auth/login', { data: { email, password } });
  expect(
    res.ok(),
    `Could not sign in as ${account} (${email}): HTTP ${res.status()} ${await res.text()}. ` +
      'Is the API running on port 5000 with the seeders applied?',
  ).toBeTruthy();

  const { data } = await res.json();
  await ctx.dispose();

  const file = STATE[account];
  mkdirSync(dirname(file), { recursive: true });

  const storage = {
    cookies: [],
    origins: [
      {
        origin: APP,
        localStorage: [
          { name: 'bb_access_token', value: data.tokens.accessToken },
          { name: 'bb_refresh_token', value: data.tokens.refreshToken },
          { name: 'bb_user', value: JSON.stringify(data.user) },
        ],
      },
    ],
  };

  // Playwright reads this file directly as `storageState`.
  writeFileSync(file, JSON.stringify(storage, null, 2));
  expect(existsSync(file)).toBeTruthy();
}

setup('sign in as a customer', async () => {
  await saveSession('customer');
});

setup('sign in as a vendor', async () => {
  await saveSession('vendor');
});

setup('sign in as an admin', async () => {
  await saveSession('admin');
});

setup('sign in as a rider', async () => {
  await saveSession('rider');
});
