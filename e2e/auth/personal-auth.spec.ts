import { expect, test } from '@playwright/test';

import { fulfillJson } from '../fixtures/msw-helpers';

test('개인 로그인과 회원가입 링크는 직접 접근과 새로고침 후 표시된다', async ({ page }) => {
  await page.goto('/login');
  await page.reload();

  await expect(page).toHaveURL('/login');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '회원가입하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '기업 회원' })).toHaveCount(0);
});

test('게스트와 기존 기업 세션은 회원 홈에서 로그인으로 이동한다', async ({ page }) => {
  await page.route('**/api/auth/**', (route) => fulfillJson(route, 401, {}));

  await page.goto('/home');
  await expect(page).toHaveURL('/login');
  await page.evaluate(() => sessionStorage.setItem('weiver.auth.role', 'COMPANY'));

  await page.goto('/home');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: '회원 홈' })).toHaveCount(0);
});

for (const status of [401, 500]) {
  test(`개인 세션 재발급이 ${status}로 실패하면 로그인으로 이동한다`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('weiver.auth.role', 'APPLICANT'));
    await page.route('**/api/auth/csrf', (route) =>
      fulfillJson(route, 200, { data: { csrfToken: 'mock-csrf-token' } }),
    );
    await page.route('**/api/auth/reissue', (route) => fulfillJson(route, status, {}));

    await page.goto('/home');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: '회원 홈' })).toHaveCount(0);
  });
}
