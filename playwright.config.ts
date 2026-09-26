import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3000';
const useExternalServer = process.env.E2E_EXTERNAL_SERVER === 'true';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/*.live.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  // Keep test progress visible in the GitHub Actions log.
  reporter: process.env.CI ? 'line' : 'html',
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
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: process.env.CI
            ? `NEXT_PUBLIC_E2E_TEST=true pnpm exec next start --port ${e2ePort}`
            : `NEXT_PUBLIC_E2E_TEST=true pnpm exec next dev --port ${e2ePort}`,
          url: `http://localhost:${e2ePort}`,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
