import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const port = process.env.MOCK_E2E_PORT ?? '3202';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  ...base,
  testMatch: '**/*.mock.spec.ts',
  testIgnore: [],
  use: { ...base.use, baseURL, serviceWorkers: 'allow' },
  webServer: {
    command: `VITE_ENABLE_MOCK_API=true pnpm exec vite --host 127.0.0.1 --strictPort --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
  },
});
