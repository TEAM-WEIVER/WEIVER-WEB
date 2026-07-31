import { type Page, type Route } from '@playwright/test';

import { test, expect } from '../fixtures/auth';

const PORTFOLIOS_API = '**/api/portfolios';
const PORTFOLIO_DETAIL_API = '**/api/portfolios/*';

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
  data: 'OK',
  message: 'OK',
};

async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockPortfolioLoad(page: Page, body = EMPTY_PORTFOLIO) {
  await page.route(PORTFOLIOS_API, async (route) => {
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
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
    buffer: Buffer.alloc(size),
  });
}

test('신규 포트폴리오 저장 성공 시 지원자 대시보드로 이동한다', async ({ page }) => {
  let postCalled = false;

  await mockPortfolioLoad(page);
  await page.route(PORTFOLIOS_API, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    postCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: '제출' })).toBeEnabled();

  await page.getByRole('button', { name: '제출' }).click();

  await expect(page).toHaveURL('/applicant/dashboard');
  expect(postCalled).toBe(true);
});

test('기존 포트폴리오를 불러오고 PATCH로 수정한다', async ({ page }) => {
  let patchedPortfolioId: string | undefined;

  await mockPortfolioLoad(page, EXISTING_PORTFOLIO);
  await page.route(PORTFOLIO_DETAIL_API, async (route) => {
    patchedPortfolioId = new URL(route.request().url()).pathname.split('/').at(-1);
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);

  await expect(page.getByLabel('Github')).toHaveValue('https://github.com/example');
  await expect(page.getByLabel('Notion')).toHaveValue('https://notion.so/example');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(page).toHaveURL('/applicant/dashboard');
  expect(patchedPortfolioId).toBe('7');
});

test('허용되지 않는 파일을 선택하면 오류를 표시하고 제출을 막는다', async ({ page }) => {
  await mockPortfolioLoad(page);
  await gotoPortfolio(page);

  await attachPortfolio(page, 'invalid.txt');

  await expect(page.getByText('PDF 또는 ZIP 파일만 업로드할 수 있습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
});

test('20MB를 초과한 파일을 선택하면 오류를 표시하고 제출을 막는다', async ({ page }) => {
  await mockPortfolioLoad(page);
  await gotoPortfolio(page);

  await attachPortfolio(page, 'large.pdf', 21 * 1024 * 1024);

  await expect(page.getByText('파일 크기는 20MB 이하여야 합니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
});

test('콘텐츠 없이 동의만 하면 제출할 수 없다', async ({ page }) => {
  await mockPortfolioLoad(page);
  await gotoPortfolio(page);

  await page.getByRole('checkbox').check();

  await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
});

test('저장 API 실패 시 오류를 표시하고 현재 페이지를 유지한다', async ({ page }) => {
  await mockPortfolioLoad(page);
  await page.route(PORTFOLIOS_API, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    await fulfillJson(route, 500, {
      status: 'INTERNAL_SERVER_ERROR',
      code: 500,
      data: null,
      message: '서버 오류',
    });
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '제출' }).click();

  await expect(
    page.getByText('업로드 중 오류가 발생했습니다. 다시 시도해주세요.', { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL('/onboarding/portfolio');
  await expect(page.getByRole('button', { name: '제출' })).toBeEnabled();
});

test('저장 중에는 제출 버튼이 비활성화되어 중복 제출을 방지한다', async ({ page }) => {
  let releaseSave: (() => void) | undefined;

  await mockPortfolioLoad(page);
  await page.route(PORTFOLIOS_API, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);
  await attachPortfolio(page);
  await page.getByRole('checkbox').check();

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toHaveAttribute('aria-busy', 'true');

  await expect.poll(() => releaseSave).toBeDefined();
  releaseSave!();
  await expect(page).toHaveURL('/applicant/dashboard');
});

test('나중에 작성을 선택하면 저장 API 없이 지원자 대시보드로 이동한다', async ({ page }) => {
  let saveCalled = false;

  await mockPortfolioLoad(page);
  await page.route(PORTFOLIOS_API, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    saveCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoPortfolio(page);
  await page.getByRole('button', { name: '나중에 작성' }).click();

  await expect(page).toHaveURL('/applicant/dashboard');
  expect(saveCalled).toBe(false);
});
