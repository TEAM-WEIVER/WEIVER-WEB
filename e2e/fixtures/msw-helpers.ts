import { type Route } from '@playwright/test';

/**
 * Playwright route 핸들러에서 JSON 응답을 반환하는 공통 헬퍼.
 * resume-snapshot, portfolio-submit, dashboard-submission-status 세 파일에서 공유한다.
 */
export async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
