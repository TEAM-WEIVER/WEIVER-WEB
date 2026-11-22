import { expect, test, type Page } from '@playwright/test';

const FLOW_ID = '00000000-0000-4000-8000-000000000193';

async function mockKakaoFlow(page: Page, baseURL: string, existing = false) {
  const captured = { start: 0, exchange: 0, signup: [] as Record<string, unknown>[] };
  await page.route('https://api.weiverai.com/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (path === '/api/auth/csrf') {
      await route.fulfill({ json: { data: { csrfToken: 'mock-csrf' } } });
      return;
    }
    if (path === '/api/applicants') {
      await route.fulfill({ json: { data: { ApplicantDTO: { name: '테스트' } } } });
      return;
    }
    expect(request.headers()['x-xsrf-token']).toBe('mock-csrf');
    expect(request.headers().authorization).toBeUndefined();
    if (path.endsWith('/kakao/start')) {
      captured.start += 1;
      await route.fulfill({
        json: {
          data: {
            authorizationUrl: 'https://kauth.kakao.com/oauth/authorize?state=mock',
            flowId: FLOW_ID,
          },
        },
      });
    } else if (path.endsWith('/kakao/exchange')) {
      captured.exchange += 1;
      expect(request.postDataJSON()).toEqual({ flowId: FLOW_ID });
      await route.fulfill({
        json: {
          status: 'success',
          data: existing
            ? { status: 'LOGGED_IN', accessToken: 'mock-access', role: 'APPLICANT' }
            : {
                status: 'SIGNUP_REQUIRED',
                signupToken: 'mock-signup',
                verifiedEmail: 'user@example.com',
              },
        },
      });
    } else if (path.endsWith('/kakao/signup/complete')) {
      captured.signup.push(request.postDataJSON());
      await route.fulfill({
        status: 201,
        json: { data: { accessToken: 'mock-access', role: 'APPLICANT' } },
      });
    } else {
      await route.abort();
    }
  });
  // Simulate the external navigation and server callback without contacting Kakao or the API.
  await page.route('https://kauth.kakao.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(`${baseURL}/auth/kakao/return`)})</script>`,
    }),
  );
  return captured;
}

test('카카오 버튼 → 외부 이동 → 복귀 → 필수 약관 → 홈', async ({ page, baseURL }) => {
  const captured = await mockKakaoFlow(page, baseURL!);
  await page.goto('/login');
  await page.getByRole('button', { name: '카카오로 시작하기' }).click();
  await expect(page).toHaveURL('/signup/kakao');
  await expect(page.getByRole('button', { name: '회원가입 완료' })).toBeDisabled();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  for (const name of [
    '서비스 이용약관을 읽고 동의합니다.',
    '개인정보 처리방침을 읽고 동의합니다.',
    '개인회원 이용약관을 읽고 동의합니다.',
    'AI 분석에 동의합니다.',
    '민감정보 처리에 동의합니다.',
  ])
    await page.getByRole('checkbox', { name, exact: true }).check();
  await page.getByRole('button', { name: '회원가입 완료' }).click();
  await expect(page.getByRole('heading', { name: '회원 홈' })).toBeVisible();
  expect(captured.start).toBe(1);
  expect(captured.exchange).toBe(1);
  expect(captured.signup).toEqual([
    {
      signupToken: 'mock-signup',
      agreements: {
        termsOfService: true,
        privacyPolicy: true,
        individualMemberTerms: true,
        aiAnalysisConsent: true,
        sensitiveDataConsent: true,
        marketingConsent: false,
      },
    },
  ]);
  expect(await page.evaluate(() => sessionStorage.getItem('weiver.kakao.login.flow'))).toBeNull();
  expect(await page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain('mock-signup');
});

test('기존 카카오 회원은 약관·가입 요청 없이 홈으로 이동한다', async ({ page, baseURL }) => {
  const captured = await mockKakaoFlow(page, baseURL!, true);
  await page.goto('/login');
  await page.getByRole('button', { name: '카카오로 시작하기' }).click();
  await expect(page.getByRole('heading', { name: '회원 홈' })).toBeVisible();
  expect(captured.exchange).toBe(1);
  expect(captured.signup).toHaveLength(0);
});

test('가입 화면 새로고침 뒤 일회용 가입 정보를 재사용하지 않는다', async ({ page, baseURL }) => {
  const captured = await mockKakaoFlow(page, baseURL!);
  await page.goto('/login');
  await page.getByRole('button', { name: '카카오로 시작하기' }).click();
  await expect(page).toHaveURL('/signup/kakao');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('가입 정보가 없거나 만료되었습니다.');
  await page.getByRole('link', { name: '로그인으로 돌아가기' }).click();
  await expect(page).toHaveURL('/login');
  expect(captured.exchange).toBe(1);
  expect(captured.signup).toHaveLength(0);
});
