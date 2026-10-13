import type { Page } from '@playwright/test';

const LANDING_API_ORIGIN = 'https://landing-api.weiverai.com';

/** Only browser APIs are mocked; HTML and assets use the real server rewrite. */
export async function mockLandingApis(
  page: Page,
  reservationStatus: number | 'network-error' = 201,
) {
  const reservations: { url: string; body: Record<string, unknown> }[] = [];
  const unexpectedRequests: string[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== LANDING_API_ORIGIN || request.method() !== 'POST') {
      unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort();
      return;
    }

    if (url.pathname === '/api/v1/reservations') {
      reservations.push({ url: request.url(), body: request.postDataJSON() });
      if (reservationStatus === 'network-error') {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        status: reservationStatus,
        json:
          reservationStatus === 201
            ? { id: 'test-reservation', surveyAccessToken: 'test-survey-token' }
            : { message: 'Mock reservation failure' },
      });
    } else if (url.pathname === '/api/v1/visitors/bootstrap') {
      await route.fulfill({ status: 200, json: { visitorId: 'test-visitor' } });
    } else if (url.pathname === '/api/v1/events') {
      await route.fulfill({ status: 202, json: {} });
    } else {
      unexpectedRequests.push(`${request.method()} ${url.pathname}`);
      await route.abort();
    }
  });

  return { reservations, unexpectedRequests };
}
