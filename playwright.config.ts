import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests.
 *
 * These run against a real API and a real database. That is deliberate: the
 * failures worth catching here are the ones between the two — a response shape
 * the screen reads wrongly, a compliance rule the UI does not surface, a route
 * that does not exist. Mocking the API away would remove exactly the class of
 * bug this suite exists to find.
 *
 * The API must already be running on port 5000 with the seeders applied. The
 * dev server is started by Playwright if it is not up.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',

  // A shared database means tests cannot safely mutate in parallel.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
  },

  projects: [
    // Signs in once per role and saves the session, so the suite does not
    // exhaust the API's authentication rate limit.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
