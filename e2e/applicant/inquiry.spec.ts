import { expect, test, type Page, type Route } from '@playwright/test';

const INQUIRIES_API = '**/api/inquiries';

const apiResponse = <TData>(data: TData, message = 'OK') => ({
  status: 'OK',
  code: 200,
  data,
  message,
});

async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setupApplicantSession(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('weiver.auth.role', 'APPLICANT');
  });
  await page.route('**/api/auth/csrf', (route) =>
    fulfillJson(route, 200, apiResponse({ csrfToken: 'mock-csrf-token' })),
  );
  await page.route('**/api/auth/reissue', (route) =>
    fulfillJson(route, 200, apiResponse({ accessToken: 'mock-access-token' })),
  );
}

async function gotoInquiry(page: Page) {
  await setupApplicantSession(page);
  await page.goto('/applicant/inquiries/new');
  await expect(page.getByRole('heading', { name: '문의' })).toBeVisible();
}

async function openInquiryForm(page: Page) {
  await page.getByRole('button', { name: '문의사항 작성' }).click();
  await expect(page.getByRole('textbox', { name: '문의 제목' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '문의 내용' })).toBeVisible();
}

test('AC1: 사이드바의 문의 아이콘을 선택하면 문의 페이지로 이동한다', async ({ page }) => {
  await setupApplicantSession(page);
  await page.goto('/applicant/dashboard');

  await page.getByRole('link', { name: '문의' }).click();

  await expect(page).toHaveURL('/applicant/inquiries/new');
  await expect(page.getByRole('heading', { name: '문의' })).toBeVisible();
});

test('AC2: 문의 페이지는 Figma 기본 카드와 확장 가능한 문의 작성 폼을 제공한다', async ({
  page,
}) => {
  await gotoInquiry(page);

  await expect(page.getByText('위버 CS팀으로 문의사항을 전달합니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '문의사항 작성' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  await openInquiryForm(page);

  await expect(page.getByRole('button', { name: '문의사항 작성' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});

test('AC3: 제목과 내용을 제출하면 문의 API를 호출하고 성공 토스트를 표시한다', async ({ page }) => {
  await setupApplicantSession(page);
  let requestBody: unknown;
  await page.route(INQUIRIES_API, async (route) => {
    requestBody = route.request().postDataJSON();
    await fulfillJson(route, 200, apiResponse(null));
  });
  await page.goto('/applicant/inquiries/new');
  await openInquiryForm(page);
  await page.getByRole('textbox', { name: '문의 제목' }).fill('면접 일정 문의');
  await page.getByRole('textbox', { name: '문의 내용' }).fill('면접 일정을 변경하고 싶습니다.');

  await page.getByRole('button', { name: '문의 제출' }).click();

  await expect
    .poll(() => requestBody)
    .toEqual({
      title: '면접 일정 문의',
      content: '면접 일정을 변경하고 싶습니다.',
    });
  await expect(page.getByRole('alert', { name: '문의 알림' })).toContainText(
    '문의가 접수되었습니다.',
  );
});

test('AC4: 빈 제목 또는 내용은 요청 없이 토스트로 안내한다', async ({ page }) => {
  await gotoInquiry(page);
  let requestCount = 0;
  await page.route(INQUIRIES_API, (route) => {
    requestCount += 1;
    return fulfillJson(route, 200, apiResponse(null));
  });
  await openInquiryForm(page);
  await page.getByRole('textbox', { name: '문의 제목' }).fill(' ');

  await page.getByRole('button', { name: '문의 제출' }).click();

  await expect(page.getByRole('alert', { name: '문의 알림' })).toContainText(
    '문의 제목과 내용을 입력해주세요.',
  );
  expect(requestCount).toBe(0);
});

test('AC5: 문의 API 실패 시 입력값을 유지하고 오류 토스트를 표시한다', async ({ page }) => {
  await setupApplicantSession(page);
  await page.route(INQUIRIES_API, (route) =>
    fulfillJson(route, 500, {
      status: 'INTERNAL_SERVER_ERROR',
      code: 500,
      data: null,
      message: '문의 전송에 실패했습니다. 다시 시도해주세요.',
    }),
  );
  await page.goto('/applicant/inquiries/new');
  await openInquiryForm(page);
  await page.getByRole('textbox', { name: '문의 제목' }).fill('면접 일정 문의');
  await page.getByRole('textbox', { name: '문의 내용' }).fill('면접 일정을 변경하고 싶습니다.');

  await page.getByRole('button', { name: '문의 제출' }).click();

  await expect(page.getByRole('alert', { name: '문의 알림' })).toContainText(
    '문의 전송에 실패했습니다. 다시 시도해주세요.',
  );
  await expect(page.getByRole('textbox', { name: '문의 제목' })).toHaveValue('면접 일정 문의');
  await expect(page.getByRole('textbox', { name: '문의 내용' })).toHaveValue(
    '면접 일정을 변경하고 싶습니다.',
  );
});
