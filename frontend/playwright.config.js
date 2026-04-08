import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    // Auth setup: logs in once and saves state for reuse
    {
      name: 'auth-setup',
      testMatch: /auth-setup\.js/,
      teardown: undefined,
    },
    // Tests that DON'T need auth (login page, registration, public routes)
    {
      name: 'no-auth',
      testMatch: /auth\.spec\.js/,
      use: { browserName: 'chromium' },
    },
    // Tests that need auth — reuse saved login state
    {
      name: 'authenticated',
      testIgnore: /auth\.spec\.js/,
      dependencies: ['auth-setup'],
      use: {
        browserName: 'chromium',
        storageState: './e2e/.auth-state.json',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      port: 3001,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
