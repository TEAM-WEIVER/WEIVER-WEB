import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';

import { acceptRequiredAgreements, fillSignupAccount } from './signup-flow';

const RUN_LIVE_SIGNUP = process.env.RUN_PRODUCTION_SIGNUP_E2E === 'true';
const VERIFICATION_CODE = '000000';
const PASSWORD = 'E2e-signup1!';

test.describe.configure({ mode: 'serial' });

test('운영 API: @weiver.test 계정의 실제 회원가입을 완료한다', async ({ page }) => {
  test.skip(
    !RUN_LIVE_SIGNUP,
    'RUN_PRODUCTION_SIGNUP_E2E=true인 명시적 실행에서만 운영 API를 호출합니다.',
  );

  const email = `e2e-${Date.now()}-${randomUUID()}@weiver.test`;

  await page.goto('/signup/account-info');
  await fillSignupAccount(page, { email, code: VERIFICATION_CODE, password: PASSWORD });
  await acceptRequiredAgreements(page);

  const completeResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/applicants/signup/agreements') &&
      response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: '다음 단계' }).click();

  const completeResponse = await completeResponsePromise;
  expect(completeResponse.ok()).toBe(true);
  await expect(page).toHaveURL('/login');
});
