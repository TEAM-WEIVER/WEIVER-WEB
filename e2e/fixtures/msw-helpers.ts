import { type Route } from '@playwright/test';

/** Playwright route 핸들러의 JSON 응답을 반환한다. */
export async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
