import { test, expect, type Page } from '@playwright/test';

import { mockLandingApis } from './mocks/landing-api';

async function fillReservation(page: Page) {
  for (const [field, option] of [
    ['직군 (필수)', '프론트엔드'],
    ['현재 지원 유형 (필수)', '대학생'],
    ['주 관심 직무 (필수)', '웹 프론트엔드 (서비스·제품 UI)'],
  ]) {
    await page.getByRole('combobox', { name: field, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('테스트 방문자');
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('rewrite-test@example.com');
  await page.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다. (필수)' }).check();
}

test.describe('Oracle 랜딩', () => {
  test('루트와 랜딩 정적 파일을 리다이렉트 없이 제공한다', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()).not.toHaveProperty('location');
    expect(response.headers()['content-type']).toContain('text/html');

    const html = await response.text();
    const paths = new Set(
      Array.from(
        html.matchAll(
          /(?:src|href|content)="(?:https:\/\/weiverai\.com)?(\/landing-assets\/[^"\s]+)"/g,
        ),
        (match) => match[1],
      ),
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

  test('직접 접근과 새로고침 뒤 랜딩과 이미지가 표시된다', async ({ page }) => {
    const { unexpectedRequests } = await mockLandingApis(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    for (const navigate of [() => page.goto('/'), () => page.reload()]) {
      await navigate();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: '사전예약하기', exact: true })).toBeEnabled();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const images = Array.from(document.images).filter((image) =>
              image.src.includes('/landing-assets/'),
            );
            return (
              images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0)
            );
          }),
        )
        .toBe(true);
    }
    expect(errors).toEqual([]);
    expect(unexpectedRequests).toEqual([]);
  });

  test('예약 API 성공 시 완료 안내를 표시한다', async ({ page }) => {
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
  });

  for (const status of [409, 500, 'network-error'] as const) {
    test(`예약 API가 ${status}로 실패하면 오류 안내를 표시한다`, async ({ page }) => {
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
