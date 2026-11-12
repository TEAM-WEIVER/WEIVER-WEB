import type { Page } from '@playwright/test';

export async function mockSignupApis(page: Page, agreementsStatus: 200 | 500 = 200) {
  const success = (data: unknown) => ({ status: 'OK', code: 200, data, message: 'OK' });

  await page.route('**/api/auth/applicants/email/send', (route) =>
    route.fulfill({ json: success('') }),
  );
  await page.route('**/api/auth/applicants/email/verify', (route) =>
    route.fulfill({ json: success({ verificationToken: 'mock-verification-token' }) }),
  );
  await page.route('**/api/auth/applicants/signup/init', (route) =>
    route.fulfill({ json: success({ signupToken: 'mock-signup-token' }) }),
  );
  await page.route('**/api/auth/applicants/signup/agreements', (route) =>
    route.fulfill({
      status: agreementsStatus,
      json:
        agreementsStatus === 200
          ? success({ accessToken: 'ignored-signup-token', role: 'APPLICANT' })
          : { status: 'ERROR', code: 500, data: null, message: 'Signup failed' },
    }),
  );
}
