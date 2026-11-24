import { expect, test } from '@playwright/test';

test('개인 로그인에서 같은 문서 안의 회원가입 화면으로 이동한다', async ({ page }) => {
  await page.goto('/login');
  await page.reload();

  await expect(page).toHaveURL('/login');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '기업 회원' })).toHaveCount(0);

  const document = await page.evaluateHandle(() => window.document);
  await page.getByRole('link', { name: '이메일로 회원가입', exact: true }).click();
  await expect(page).toHaveURL('/signup/account-info');
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
  expect(await document.evaluate((initial) => initial === window.document)).toBe(true);
});

test('로그인 정보 저장은 성공한 이메일만 기억하고 선택 해제 시 지운다', async ({ page }) => {
  const loginPath = '**/api/auth/applicants/login';
  await page.route(loginPath, (route) =>
    route.fulfill({ status: 401, json: { errorCode: 'INVALID_PASSWORD' } }),
  );
  await page.goto('/login');

  const email = page.getByLabel('이메일', { exact: true });
  const password = page.getByLabel('비밀번호', { exact: true });
  const remember = page.getByRole('checkbox', { name: '로그인 정보 저장' });
  const login = page.getByRole('button', { name: '로그인', exact: true });

  await login.click();
  await expect(email).toBeFocused();

  await email.fill('user@example.com');
  await password.fill('WrongPassword1!');
  await remember.check();
  await login.click();
  await expect(page.getByRole('alert')).toHaveText('이메일 또는 비밀번호가 일치하지 않습니다.');

  await page.reload();
  await expect(email).toHaveValue('');
  await expect(remember).not.toBeChecked();

  await page.unroute(loginPath);
  await page.route(loginPath, (route) =>
    route.fulfill({ json: { data: { accessToken: 'mock-token', role: 'APPLICANT' } } }),
  );
  await email.fill('user@example.com');
  await password.fill('Password123!');
  await remember.check();
  await login.click();
  await expect(page).toHaveURL('/home');

  await page.goto('/login');
  await page.reload();
  await expect(email).toHaveValue('user@example.com');
  await expect(password).toHaveValue('');
  await expect(remember).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('weiver.auth.remembered-email'))).toBe(
    'user@example.com',
  );

  await remember.uncheck();
  await page.reload();
  await expect(email).toHaveValue('');
  await expect(remember).not.toBeChecked();
});

test('게스트와 기존 기업 세션은 회원 홈에서 로그인으로 이동한다', async ({ page }) => {
  await page.route('**/api/auth/**', (route) => route.fulfill({ status: 401, json: {} }));

  await page.goto('/home');
  await expect(page).toHaveURL('/login');
  await page.evaluate(() => sessionStorage.setItem('weiver.auth.role', 'COMPANY'));

  await page.goto('/home');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: /오늘도 면접을 준비해볼까요/ })).toHaveCount(0);
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
    await expect(page.getByRole('heading', { name: /오늘도 면접을 준비해볼까요/ })).toHaveCount(0);
  });
}

test('회원 홈은 새로고침 후 이름을 한 번 조회하고 푸터·로그아웃을 제공한다', async ({ page }) => {
  let profileRequests = 0;
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.setItem('weiver.auth.role', 'APPLICANT'));
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { data: { csrfToken: 'mock-csrf-token' } } }),
  );
  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({ json: { data: { accessToken: 'mock-token' } } }),
  );
  await page.route('**/api/applicants', (route) => {
    profileRequests += 1;
    return route.fulfill({ json: { data: { ApplicantDTO: { name: '김민수' } } } });
  });
  await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204 }));

  await page.goto('/home');
  const heading = page.getByRole('heading', {
    level: 1,
    name: '김민수님, 오늘도 면접을 준비해볼까요?',
  });
  await expect(heading).toBeVisible();
  await expect(page.getByRole('button', { name: '김민수 프로필' })).toBeVisible();
  expect(profileRequests).toBe(1);
  await expect(page.getByRole('contentinfo')).toContainText('개인정보처리방침');
  await expect(page.getByText('이력서 관리 기능을 준비 중이에요.')).toBeVisible();
  await expect(page.getByRole('button', { name: '포인트 충전하기' })).toBeDisabled();
  await expect(page.getByRole('link', { name: '위버 홈' })).toHaveAttribute('href', '/home');

  await page.reload();
  await expect(heading).toBeVisible();
  expect(profileRequests).toBe(2);
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL('/login');
  expect(await page.evaluate(() => sessionStorage.getItem('weiver.auth.role'))).toBeNull();
  await page.goto('/home');
  await expect(page).toHaveURL('/login');
});
