import { test as base, expect, type Page } from '@playwright/test';

const AUTH_ROLE_STORAGE_KEY = 'weiver.auth.role';

const apiResponse = <TData>(data: TData) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

export async function mockApplicantAuth(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      window.sessionStorage.setItem(storageKey, 'APPLICANT');
    },
    { storageKey: AUTH_ROLE_STORAGE_KEY },
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ csrfToken: 'mock-csrf-token' })),
    }),
  );

  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ accessToken: 'mock-access-token' })),
    }),
  );
}

export async function mockCorporateAuth(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      window.sessionStorage.setItem(storageKey, 'CORPORATE');
    },
    { storageKey: AUTH_ROLE_STORAGE_KEY },
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ csrfToken: 'mock-csrf-token' })),
    }),
  );

  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ accessToken: 'mock-access-token' })),
    }),
  );
}

export const test = base.extend<{ applicantAuth: void; corporateAuth: void }>({
  applicantAuth: [
    async ({ page }, use) => {
      await mockApplicantAuth(page);
      await use();
    },
    { auto: true },
  ],
  corporateAuth: [
    async ({ page }, use) => {
      await mockCorporateAuth(page);
      await use();
    },
    { auto: false },
  ],
});

export { expect };
