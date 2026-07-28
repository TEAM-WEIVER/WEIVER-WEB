import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';

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
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '인증번호 전송' }).click();

  await expect(page.getByLabel('이메일 인증번호')).toBeVisible();
  await page.getByLabel('이메일 인증번호').fill(VERIFICATION_CODE);
  await page.getByRole('button', { name: '인증번호 확인' }).click();
  await expect(page.getByText('인증 완료')).toBeVisible();

  await page.getByRole('textbox', { name: '비밀번호', exact: true }).fill(PASSWORD);
  await page.getByRole('textbox', { name: '비밀번호 확인', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page).toHaveURL('/signup/agreements');

  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 처리방침/ }).check();
  await page.getByRole('checkbox', { name: /개인회원 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /AI 분석에 동의/ }).check();
  await page.getByRole('checkbox', { name: /민감정보 처리에 동의/ }).check();

  const completeResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/signup/complete') &&
      response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: '다음 단계' }).click();

  const completeResponse = await completeResponsePromise;
  expect(completeResponse.ok()).toBe(true);
  await expect(completeResponse.json()).resolves.toMatchObject({
    data: { role: 'APPLICANT' },
  });
});
