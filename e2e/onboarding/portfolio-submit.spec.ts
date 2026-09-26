import { type Page } from '@playwright/test';

import { test, expect } from '../fixtures/auth';
import { fulfillJson } from '../fixtures/msw-helpers';

/**
 * 포트폴리오 저장 + 프로필 제출 자동 연동 인수 테스트 (#100)
 *
 * AC6:    포트폴리오 최초 저장(POST) 후 profile/submit 자동 호출 → 대시보드 이동
 *         Promise gate: 저장 성공 완료 이후에만 submit 호출되는지 순서 검증
 * AC7:    포트폴리오 수정 저장(PATCH /api/portfolios/:portfolioId) 후 profile/submit 자동 호출
 *         portfolioId=7이 URL에 바인딩되는지 명시 검증
 * AC8:    포트폴리오 저장 실패 시 profile/submit 미호출 + 에러 메시지
 * AC12-b: profile/submit API 오류 시 에러 메시지 + 포트폴리오 페이지 유지
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  PORTFOLIOS: '**/api/portfolios',
  // 명시적 패턴: /api/portfolios/ 뒤에 하나 이상의 세그먼트 (trailing-slash 오염 방지)
  PORTFOLIO_BY_ID: '**/api/portfolios/*',
  PROFILE_SUBMIT: '**/api/applicants/profile/submit',
} as const;

const EMPTY_PORTFOLIO = {
  status: 'OK',
  code: 200,
  data: {
    portfolioId: null,
    downloadUrl: null,
    fileName: null,
    fileType: null,
    fileSize: null,
    urlGithub: null,
    urlTech: null,
    urlEtc: null,
  },
  message: 'OK',
};

const EXISTING_PORTFOLIO = {
  status: 'OK',
  code: 200,
  data: {
    portfolioId: 7,
    downloadUrl: 'https://example.com/portfolio.pdf',
    fileName: 'portfolio.pdf',
    fileType: 'PDF',
    fileSize: 1024,
    urlGithub: 'https://github.com/example',
    urlTech: 'https://notion.so/example',
    urlEtc: null,
  },
  message: 'OK',
};

const SAVE_SUCCESS = {
  status: 'OK',
  code: 200,
  data: null,
  message: 'OK',
};

const SERVER_ERROR = {
  status: 'INTERNAL_SERVER_ERROR',
  code: 500,
  data: null,
  message: '서버 오류',
};

const ALREADY_SUBMITTED_ERROR = {
  status: 'BAD_REQUEST',
  code: 400,
  data: null,
  message: 'PROFILE_ALREADY_SUBMITTED',
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

async function mockPortfolioLoad(page: Page, body = EMPTY_PORTFOLIO) {
  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 200, body);
  });
}

async function gotoPortfolio(page: Page) {
  const loadResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/portfolios') && response.request().method() === 'GET',
  );
  await page.goto('/onboarding/portfolio');
  await loadResponse;
}

async function attachPortfolio(page: Page, name = 'portfolio.pdf', size = 16) {
  // size=16(바이트)은 최소 mock 크기. 파일 크기 검증이 없는 환경을 전제함
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
    buffer: Buffer.alloc(size),
  });
}

// ---------------------------------------------------------------------------
// AC6: 포트폴리오 최초 저장 (POST) + profile/submit 자동 호출
// Major: Promise gate — 포트폴리오 저장 성공 완료 이후에만 submit이 호출되는지 순서 검증
// ---------------------------------------------------------------------------

test('AC6: 포트폴리오 신규 저장 후 profile/submit이 자동으로 호출되고 대시보드로 이동한다', async ({
  page,
}) => {
  // Given — 포트폴리오 없음 (portfolioId = null)
  let postPortfolioCalled = false;
  let submitCalled = false;
  let submitCalledAfterPortfolio = false;

  await mockPortfolioLoad(page, EMPTY_PORTFOLIO);

  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    postPortfolioCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await page.route(API.PROFILE_SUBMIT, async (route) => {
    submitCalled = true;
    // Promise gate 검증: submit 시점에 이미 portfolios POST가 완료되어 있어야 함
    submitCalledAfterPortfolio = postPortfolioCalled;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);

  // When — 파일 첨부 + 동의 후 제출
  await attachPortfolio(page);
  await page.getByRole('checkbox', { name: '동의' }).check();

  // 포트폴리오 POST 응답 완료 이후 submit이 호출되는지 네트워크 순서 검증
  const portfolioPostResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/portfolios') && response.request().method() === 'POST',
  );
  const submitPostResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/profile/submit'),
  );

  await page.getByRole('button', { name: '제출' }).click();

  // Then — 포트폴리오 저장 먼저 완료
  await portfolioPostResponse;

  // Then — 그 이후 submit 호출
  await submitPostResponse;

  // Then — 대시보드로 이동
  await expect(page).toHaveURL('/applicant/dashboard');

  // Then — POST /api/portfolios 호출됨
  expect(postPortfolioCalled).toBe(true);

  // Then — POST /api/applicants/profile/submit 자동 호출됨 (portfolios 저장 이후)
  expect(submitCalled).toBe(true);
  expect(submitCalledAfterPortfolio).toBe(true);
});

test('AC6: 포트폴리오 최초 저장 시 PATCH가 아닌 POST를 사용한다', async ({ page }) => {
  let patchCalled = false;
  let postCalled = false;

  await mockPortfolioLoad(page, EMPTY_PORTFOLIO);

  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() === 'POST') {
      postCalled = true;
      await fulfillJson(route, 200, SAVE_SUCCESS);
    } else {
      await route.continue();
    }
  });
  await page.route(API.PORTFOLIO_BY_ID, async (route) => {
    if (route.request().method() === 'PATCH') {
      patchCalled = true;
      await fulfillJson(route, 200, SAVE_SUCCESS);
    } else {
      await route.continue();
    }
  });
  await page.route(API.PROFILE_SUBMIT, async (route) => {
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox', { name: '동의' }).check();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(page).toHaveURL('/applicant/dashboard');
  expect(postCalled).toBe(true);
  expect(patchCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// AC7: 포트폴리오 수정 저장 (PATCH) + profile/submit 자동 호출
// Major: PATCH /api/portfolios/{portfolioId} — URL에 portfolioId=7이 실제 바인딩되는지 검증
// ---------------------------------------------------------------------------

test('AC7: 기존 포트폴리오 수정 시 PATCH /api/portfolios/7로 저장 후 profile/submit이 자동 호출되고 대시보드로 이동한다', async ({
  page,
}) => {
  // Given — portfolioId = 7인 포트폴리오 존재
  let patchedUrl: string | undefined;
  let patchedPortfolioId: string | undefined;
  let submitCalled = false;
  let patchCalledBeforeSubmit = false;

  await mockPortfolioLoad(page, EXISTING_PORTFOLIO);

  await page.route(API.PORTFOLIO_BY_ID, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.continue();
      return;
    }
    patchedUrl = route.request().url();
    patchedPortfolioId = new URL(route.request().url()).pathname.split('/').at(-1);
    patchCalledBeforeSubmit = !submitCalled;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await page.route(API.PROFILE_SUBMIT, async (route) => {
    submitCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);

  // Then — 기존 데이터 prefill 확인
  await expect(page.getByLabel('Github')).toHaveValue('https://github.com/example');

  // When — URL 수정 후 제출 (실제 필드 변경 포함)
  await page.getByLabel('Github').fill('https://github.com/updated-example');

  await page.getByRole('checkbox', { name: '동의' }).check();

  // PATCH 완료 이후 submit 호출 순서 검증을 위해 응답 대기
  const patchResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/portfolios/') && response.request().method() === 'PATCH',
  );
  const submitResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/profile/submit'),
  );

  await page.getByRole('button', { name: '제출' }).click();

  await patchResponse;
  await submitResponse;

  // Then — 대시보드로 이동
  await expect(page).toHaveURL('/applicant/dashboard');

  // Then — PATCH /api/portfolios/7 호출됨 (URL에 portfolioId=7 바인딩 검증)
  expect(patchedPortfolioId).toBe('7');
  expect(patchedUrl).toMatch(/\/api\/portfolios\/7$/);

  // Then — PATCH 이후 submit 호출 (순서 보장)
  expect(patchCalledBeforeSubmit).toBe(true);
  expect(submitCalled).toBe(true);
});

// ---------------------------------------------------------------------------
// AC8: 포트폴리오 저장 실패 — profile/submit 미호출 + 에러 메시지
// ---------------------------------------------------------------------------

test('AC8: 포트폴리오 저장 실패 시 profile/submit을 호출하지 않고 에러 메시지를 표시한다', async ({
  page,
}) => {
  let submitCalled = false;

  await mockPortfolioLoad(page, EMPTY_PORTFOLIO);

  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 500, SERVER_ERROR);
  });

  await page.route(API.PROFILE_SUBMIT, async (route) => {
    submitCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox', { name: '동의' }).check();
  await page.getByRole('button', { name: '제출' }).click();

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('업로드 중 오류가 발생했습니다. 다시 시도해주세요.', { exact: true }),
  ).toBeVisible();

  // Then — 페이지 유지 (대시보드로 이동하지 않음)
  await expect(page).toHaveURL('/onboarding/portfolio');

  // Then — profile/submit 미호출
  expect(submitCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// AC12-b: profile/submit API 오류 — 에러 메시지 + 포트폴리오 페이지 유지
// ---------------------------------------------------------------------------

test('AC12-b: 포트폴리오 저장 후 profile/submit 실패 시 에러 메시지를 표시하고 페이지를 유지한다', async ({
  page,
}) => {
  await mockPortfolioLoad(page, EMPTY_PORTFOLIO);

  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  // profile/submit이 400 오류 반환 (PROFILE_ALREADY_SUBMITTED)
  await page.route(API.PROFILE_SUBMIT, async (route) => {
    await fulfillJson(route, 400, ALREADY_SUBMITTED_ERROR);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox', { name: '동의' }).check();
  await page.getByRole('button', { name: '제출' }).click();

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('제출 중 오류가 발생했습니다. 다시 시도해주세요.', { exact: true }),
  ).toBeVisible();

  // Then — 포트폴리오 페이지 유지 (대시보드로 이동하지 않음)
  await expect(page).toHaveURL('/onboarding/portfolio');
});

test('AC12-b: profile/submit 서버 오류 시에도 에러 메시지를 표시하고 페이지를 유지한다', async ({
  page,
}) => {
  await mockPortfolioLoad(page, EMPTY_PORTFOLIO);

  await page.route(API.PORTFOLIOS, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await page.route(API.PROFILE_SUBMIT, async (route) => {
    await fulfillJson(route, 500, SERVER_ERROR);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox', { name: '동의' }).check();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(
    page.getByText('제출 중 오류가 발생했습니다. 다시 시도해주세요.', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/onboarding/portfolio');
});
