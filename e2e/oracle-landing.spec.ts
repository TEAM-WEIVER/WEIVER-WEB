import { test, expect, type Page } from '@playwright/test';

import { mockLandingApis } from './mocks/landing-api';

async function fillReservation(page: Page) {
  await page.getByRole('button', { name: '사전예약하기', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('가장 먼저 만나보세요.');
  await dialog
    .getByRole('textbox', { name: '이메일', exact: true })
    .fill('rewrite-test@example.com');
  await dialog.getByRole('checkbox', { name: '개인정보 수집·이용에 동의합니다. (필수)' }).check();
  return dialog;
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
    const ogImageTag = html.match(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/i)?.[0];
    const ogImageContent = ogImageTag?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    expect(ogImageContent, 'og:image 메타 태그가 있어야 한다').toBeTruthy();
    const ogImage = new URL(ogImageContent!, 'https://weiverai.com');
    expect(ogImage.origin).toBe('https://weiverai.com');
    expect(ogImage.pathname).toMatch(/^\/landing-assets\//);
    const ogImagePath = `${ogImage.pathname}${ogImage.search}`;
    paths.add(ogImagePath);

    for (const path of paths) {
      const asset = await request.get(path);
      expect(asset.status(), path).toBe(200);
      const type = asset.headers()['content-type'];
      expect(type, path).not.toContain('text/html');
      if (path === ogImagePath) expect(type, path).toMatch(/^image\//);
      if (path.endsWith('.js')) expect(type).toMatch(/javascript/);
      if (path.endsWith('.css')) expect(type).toContain('text/css');
      if (path.endsWith('.png')) expect(type).toContain('image/png');
      expect((await asset.body()).length, path).toBeGreaterThan(0);
    }
  });

  test('직접 접근과 새로고침 뒤 랜딩 로고와 예약 진입 버튼이 표시된다', async ({ page }) => {
    const { unexpectedRequests } = await mockLandingApis(page);
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (
        new URL(response.url()).pathname.startsWith('/landing-assets/') &&
        response.status() >= 400
      ) {
        failedAssets.push(`${response.status()} ${response.url()}`);
      }
    });

    for (const navigate of [() => page.goto('/'), () => page.reload()]) {
      await navigate();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('img', { name: 'weiver', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '사전예약하기', exact: true })).toBeEnabled();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const images = Array.from(document.images).filter((image) =>
              image.src.includes('/landing-assets/'),
            );
            // The current landing uses a CSS logo and canvas; validate img resources if present.
            return images.every((image) => image.complete && image.naturalWidth > 0);
          }),
        )
        .toBe(true);
    }
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
    expect(unexpectedRequests).toEqual([]);
  });

  test('예약 API 성공 시 완료 안내를 표시한다', async ({ page }) => {
    const { reservations, unexpectedRequests } = await mockLandingApis(page);
    await page.goto('/');
    const dialog = await fillReservation(page);
    await dialog.getByRole('button', { name: '출시 알림 받기', exact: true }).click();
    await expect(
      dialog.getByRole('status').filter({ hasText: '예약이 완료됐어요.' }),
    ).toBeVisible();
    expect(reservations).toHaveLength(1);
    expect(reservations[0].url).toBe('https://landing-api.weiverai.com/api/v1/reservations/launch');
    expect(reservations[0].body).toMatchObject({
      email: 'rewrite-test@example.com',
      privacyConsent: true,
    });
    expect(unexpectedRequests).toEqual([]);
  });

  for (const status of [409, 500, 'network-error'] as const) {
    test(`예약 API가 ${status}로 실패하면 오류 안내를 표시한다`, async ({ page }) => {
      const { reservations, unexpectedRequests } = await mockLandingApis(page, status);
      await page.goto('/');
      const dialog = await fillReservation(page);
      await dialog.getByRole('button', { name: '출시 알림 받기', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText(
        status === 409
          ? '이미 예약된 이메일이에요. 위버가 준비되면 알려드릴게요.'
          : '예약을 완료하지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      await expect(
        dialog.getByRole('status').filter({ hasText: '예약이 완료됐어요.' }),
      ).toHaveCount(0);
      await expect(
        dialog.getByRole('button', { name: '출시 알림 받기', exact: true }),
      ).toBeEnabled();
      await expect(dialog.getByRole('textbox', { name: '이메일', exact: true })).toHaveValue(
        'rewrite-test@example.com',
      );
      expect(reservations).toHaveLength(1);
      expect(unexpectedRequests).toEqual([]);
    });
  }
});
