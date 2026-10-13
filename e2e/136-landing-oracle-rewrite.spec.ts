import { test, expect, type Page } from '@playwright/test';

import { mockLandingApis } from './mocks/landing-api';

const LANDING_HEADING = '한 번 준비하고, 여러 기업에게 먼저 제안받으세요.';

async function fillReservation(page: Page) {
  await page.getByRole('combobox', { name: '직군 (필수)', exact: true }).selectOption('FE');
  await page.getByRole('combobox', { name: '현재 지원 유형 (필수)' }).selectOption('student');
  await page.getByRole('combobox', { name: '주 관심 직무 (필수)' }).selectOption('web_frontend');
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('테스트 방문자');
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('rewrite-test@example.com');
  await page.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다. (필수)' }).check();
}

test.describe('#136 Oracle external rewrite', () => {
  test('AC1: 루트 HTTP 응답은 랜딩 HTML이며 리다이렉트하지 않는다', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()).not.toHaveProperty('location');
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('한 번 준비하고, 여러 기업에게 먼저 제안받으세요');
  });

  test('AC2: HTML이 참조하는 JS·CSS·favicon·공유 이미지가 올바른 파일로 제공된다', async ({
    request,
  }) => {
    const response = await request.get('/');
    const html = await response.text();
    const paths = new Set(
      [
        ...html.matchAll(
          /(?:src|href|content)="(?:https:\/\/weiverai\.com)?(\/landing-assets\/[^"\s]+)"/g,
        ),
      ].map((match) => match[1]),
    );
    expect([...paths].some((path) => path.endsWith('.js'))).toBe(true);
    expect([...paths].some((path) => path.endsWith('.css'))).toBe(true);
    expect(paths.has('/landing-assets/favicon.png')).toBe(true);
    expect(paths.has('/landing-assets/weiver-og.png')).toBe(true);

    for (const path of paths) {
      const asset = await request.get(path);
      expect(asset.status(), path).toBe(200);
      const type = asset.headers()['content-type'];
      expect(type, path).not.toContain('text/html');
      if (path.endsWith('.js')) expect(type).toMatch(/javascript/);
      if (path.endsWith('.css')) expect(type).toContain('text/css');
      if (path.endsWith('.png')) expect(type).toContain('image/png');
      expect((await asset.body()).length, path).toBeGreaterThan(0);
    }
  });

  test('AC1·AC2: 직접 접근·새로고침 후 실제 랜딩 콘텐츠와 이미지가 표시된다', async ({ page }) => {
    const { unexpectedRequests } = await mockLandingApis(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    for (const navigate of [() => page.goto('/'), () => page.reload()]) {
      await navigate();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: LANDING_HEADING, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '사전예약하기', exact: true })).toBeEnabled();
      await expect
        .poll(() =>
          page
            .locator('img')
            .evaluateAll(
              (images) => images.filter((image) => image.src.includes('/landing-assets/')).length,
            ),
        )
        .toBeGreaterThan(0);
      await expect
        .poll(() =>
          page
            .locator('img')
            .evaluateAll(
              (images) =>
                images.filter(
                  (image) =>
                    image.src.includes('/landing-assets/') &&
                    (!image.complete || image.naturalWidth === 0),
                ).length,
            ),
        )
        .toBe(0);
    }
    expect(errors).toEqual([]);
    expect(unexpectedRequests).toEqual([]);
  });

  test('AC3: 회원가입 직접 접근·새로고침은 본품 화면을 유지한다', async ({ page }) => {
    await page.goto('/signup/account-info');
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL('/signup/account-info');
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: LANDING_HEADING })).toHaveCount(0);
  });

  test('AC5: 본품 Next 정적 리소스는 본품에서 제공된다', async ({ request }) => {
    const html = await (await request.get('/login')).text();
    const paths = new Set(
      [...html.matchAll(/(?:src|href)="(\/_next\/[^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map(
        (match) => match[1],
      ),
    );
    expect(paths.size).toBeGreaterThan(0);
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type']).toMatch(/javascript|text\/css/);
    }
  });

  test('AC5: 본품 내부 회원가입 이동은 Next RSC 응답으로 처리된다', async ({ page }) => {
    const rscPaths: string[] = [];
    page.on('response', (response) => {
      if (response.headers()['content-type']?.includes('text/x-component')) {
        rscPaths.push(new URL(response.url()).pathname);
      }
    });
    await page.goto('/login');
    await page.getByRole('button', { name: '개인 회원', exact: true }).click();
    await page.getByRole('link', { name: '회원가입하기', exact: true }).click();
    await expect(page).toHaveURL('/signup/account-info');
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await expect.poll(() => rscPaths.includes('/signup/account-info')).toBe(true);
  });

  test('AC5: 알 수 없는 페이지·API와 운영 dev-proxy는 랜딩으로 대체하지 않는다', async ({
    request,
  }) => {
    for (const path of [
      '/rewrite-unknown-page',
      '/api/rewrite-unknown',
      '/api/auth/rewrite-unknown',
      '/api/dev-proxy/rewrite-unknown',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text()).not.toContain(
        '한 번 준비하고, 여러 기업에게 먼저 제안받으세요',
      );
    }
  });

  test('AC6 (목): 예약은 landing-api에 직접 요청하고 기존 성공 UI를 표시한다', async ({ page }) => {
    const { reservations, unexpectedRequests } = await mockLandingApis(page);
    await page.goto('/');
    await fillReservation(page);
    await page.getByRole('button', { name: '사전예약하기', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: '사전예약이 완료됐습니다.' }),
    ).toBeVisible();
    expect(reservations).toHaveLength(1);
    expect(reservations[0].url).toBe('https://landing-api.weiverai.com/api/v1/reservations');
    expect(reservations[0].body).toMatchObject({
      name: '테스트 방문자',
      email: 'rewrite-test@example.com',
      privacyConsent: true,
      jobFamily: 'FE',
      applicantType: 'student',
      primaryRole: 'web_frontend',
    });
    expect(unexpectedRequests).toEqual([]);
    // Mock success does not prove real CORS or persistence; see manual-tests/136.
  });

  for (const status of [409, 500, 'network-error'] as const) {
    test(`AC7 (목): 예약 ${status} 실패는 기존 오류 안내를 표시한다`, async ({ page }) => {
      const { reservations, unexpectedRequests } = await mockLandingApis(page, status);
      await page.goto('/');
      await fillReservation(page);
      await page.getByRole('button', { name: '사전예약하기', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText(
        status === 409
          ? '이미 사전예약된 이메일입니다.'
          : '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      );
      await expect(
        page.getByRole('status').filter({ hasText: '사전예약이 완료됐습니다.' }),
      ).toHaveCount(0);
      expect(reservations).toHaveLength(1);
      expect(unexpectedRequests).toEqual([]);
    });
  }
});
