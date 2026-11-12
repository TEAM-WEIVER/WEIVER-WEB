import { expect, test } from '@playwright/test';

import { mockLandingApis } from './mocks/landing-api';

test('본품 URL에서 Vite 정적 파일을 제공한다', async ({ request }) => {
  const response = await request.get('/login', { maxRedirects: 0 });
  expect(response.status()).toBe(200);

  const html = await response.text();
  const paths = new Set(
    Array.from(
      html.matchAll(/(?:src|href)="(\/(?:assets|src)\/[^"\s]+\.(?:js|css|tsx)(?:\?[^"\s]*)?)"/g),
      (match) => match[1],
    ),
  );

  expect([...paths].some((path) => /\.(js|tsx)(\?|$)/.test(path))).toBe(true);
  for (const path of paths) {
    const asset = await request.get(path);
    expect(asset.status(), path).toBe(200);
    expect(asset.headers()['content-type'], path).toMatch(/javascript|text\/css/);
  }
});

test('없는 주소는 HTTP 404를 반환하고 홈 링크는 Oracle 랜딩을 연다', async ({ page }) => {
  expect((await page.goto('/페이지-없음'))?.status()).toBe(404);
  await expect(page).toHaveTitle('404 | WEIVER');
  await expect(
    page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
  ).toBeVisible();
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toHaveCount(0);

  const { unexpectedRequests } = await mockLandingApis(page);
  const landingResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/' && response.request().isNavigationRequest(),
  );
  await page.getByRole('link', { name: '홈으로 돌아가기' }).click();

  expect((await landingResponse).status()).toBe(200);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: '사전예약하기', exact: true })).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});

test('제거된 서비스 경로와 알 수 없는 API 경로는 HTTP 404를 반환한다', async ({ request }) => {
  const paths = [
    '/corporate/dashboard',
    '/corporate-dashboard-preview',
    '/applicant/dashboard',
    '/onboarding/resume',
    '/api/rewrite-unknown',
    '/api/auth/rewrite-unknown',
  ];
  if (process.env.CI) {
    paths.push('/api/dev-proxy/rewrite-unknown');
  }

  for (const path of paths) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
  }
});
