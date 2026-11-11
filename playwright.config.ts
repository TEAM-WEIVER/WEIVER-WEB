import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3000';
const isCI = Boolean(process.env.CI);
const baseURL = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/*.live.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? 'line' : 'html',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite ${isCI ? 'preview ' : ''}--host 127.0.0.1 --strictPort --port ${e2ePort}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !isCI,
  },
});
