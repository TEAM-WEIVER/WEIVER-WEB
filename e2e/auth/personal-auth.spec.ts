import { expect, test } from '@playwright/test';

test('개인 로그인에서 같은 문서 안의 회원가입 화면으로 이동한다', async ({ page }) => {
  await page.goto('/login');
  await page.reload();

  await expect(page).toHaveURL('/login');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '기업 회원' })).toHaveCount(0);

  const document = await page.evaluateHandle(() => window.document);
  await page.getByRole('link', { name: '회원가입하기', exact: true }).click();
  await expect(page).toHaveURL('/signup/account-info');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  expect(await document.evaluate((initial) => initial === window.document)).toBe(true);
});

test('게스트와 기존 기업 세션은 회원 홈에서 로그인으로 이동한다', async ({ page }) => {
  await page.route('**/api/auth/**', (route) => route.fulfill({ status: 401, json: {} }));

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
      route.fulfill({ json: { data: { csrfToken: 'mock-csrf-token' } } }),
    );
    await page.route('**/api/auth/reissue', (route) => route.fulfill({ status, json: {} }));

    await page.goto('/home');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: '회원 홈' })).toHaveCount(0);
  });
}
