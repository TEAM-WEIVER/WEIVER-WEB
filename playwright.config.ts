import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3000';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/*.live.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `NEXT_PUBLIC_E2E_TEST=true pnpm exec next start --port ${e2ePort}`
      : `NEXT_PUBLIC_E2E_TEST=true pnpm exec next dev --port ${e2ePort}`,
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: !process.env.CI,
  },
});
