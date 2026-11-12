import { expect, test } from '@playwright/test';

import { mockSignupApis } from '../mocks/signup-handlers';
import { acceptRequiredAgreements, fillSignupAccount } from './signup-flow';

const account = { email: 'test@example.com', code: '123456', password: 'Password1!' };

test('개인 가입 후 직접 로그인하면 새로고침 뒤에도 회원 홈을 이용한다', async ({ page }) => {
  await mockSignupApis(page);

  const session = { data: { accessToken: 'mock-access-token', role: 'APPLICANT' } };
  await page.route('**/api/auth/applicants/login', (route) => route.fulfill({ json: session }));
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'mock-csrf-token' } } }),
  );
  await page.route('**/api/auth/reissue', (route) => route.fulfill({ json: session }));

  await page.goto('/signup/account-info');
  await page.reload();
  await expect(page).toHaveURL('/signup/account-info');
  await fillSignupAccount(page, account);
  await acceptRequiredAgreements(page);
  await page.getByRole('button', { name: '다음 단계' }).click();

  await expect(page).toHaveURL('/login');
  expect(await page.evaluate(() => sessionStorage.getItem('weiver.auth.role'))).toBeNull();

  await page.getByLabel('이메일', { exact: true }).fill(account.email);
  await page.getByLabel('비밀번호', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('heading', { name: '회원 홈' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL('/home');
  await expect(page.getByRole('heading', { name: '회원 홈' })).toBeVisible();
});

test('가입 완료 API가 실패하면 오류를 보여주고 약관 단계에 머무른다', async ({ page }) => {
  await mockSignupApis(page, 500);
  await page.goto('/signup/account-info');
  await fillSignupAccount(page, account);
  await acceptRequiredAgreements(page);
  await page.getByRole('button', { name: '다음 단계' }).click();

  await expect(
    page.getByText('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  ).toBeVisible();
  await expect(page).toHaveURL('/signup/agreements');
});

test('진행 중인 가입 정보가 없으면 약관 URL에서 계정 정보 화면으로 이동한다', async ({ page }) => {
  expect((await page.goto('/signup/agreements'))?.status()).toBe(200);
  await expect(page).toHaveURL('/signup/account-info');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
});
