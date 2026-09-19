import { test, expect } from '../fixtures/auth';

/**
 * 포트폴리오 온보딩 스켈레톤 UI 인수 테스트 (#80)
 *
 * AC5: API 응답 지연 시 FileUploadSection, ExternalLinksSection, AgreementSection 스켈레톤 + 버튼 disabled
 * AC6: API 완료 후 실제 컴포넌트 렌더링 / GET 오류 시 빈 폼 표시
 *
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const PORTFOLIOS_API = '**/api/portfolios';

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

// ---------------------------------------------------------------------------
// AC5: 로딩 중 스켈레톤 + 버튼 disabled
// ---------------------------------------------------------------------------

test('AC5: GET 응답 전 파일 업로드, 외부 링크, 동의 영역이 스켈레톤으로 표시된다', async ({
  page,
}) => {
  // Given — GET 응답 무기한 지연
  await page.route(PORTFOLIOS_API, (route) => {
    if (route.request().method() === 'GET') return; // 응답 없음 — 로딩 유지
    return route.continue();
  });

  // When
  await page.goto('/onboarding/portfolio');

  // Then — 섹션별 스켈레톤 (aria-label로 식별)
  await expect(page.getByRole('region', { name: '파일 업로드 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '외부 링크 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '동의 로딩 중' })).toBeVisible();
});

test('AC5: 로딩 중 "이전 단계", "나중에 작성", "제출" 버튼이 모두 비활성화된다', async ({
  page,
}) => {
  // Given — GET 응답 지연
  await page.route(PORTFOLIOS_API, (route) => {
    if (route.request().method() === 'GET') return;
    return route.continue();
  });

  // When
  await page.goto('/onboarding/portfolio');

  // Then
  await expect(page.getByRole('button', { name: '이전 단계' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '나중에 작성' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '제출' })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC6: API 완료 후 실제 컴포넌트 렌더링
// ---------------------------------------------------------------------------

test('AC6: GET 응답 완료 후 스켈레톤이 제거되고 실제 섹션이 렌더링된다', async ({ page }) => {
  // Given — 기존 포트폴리오 데이터 있음
  await page.route(PORTFOLIOS_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EXISTING_PORTFOLIO),
    });
  });

  // When
  await page.goto('/onboarding/portfolio');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '파일 업로드 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '외부 링크 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '동의 로딩 중' })).toHaveCount(0);

  // Then — 기존 링크 데이터가 채워짐
  await expect(page.getByLabel('Github')).toHaveValue('https://github.com/example');
  await expect(page.getByLabel('Notion')).toHaveValue('https://notion.so/example');
});

test('AC6: GET 응답 완료 후 빈 포트폴리오면 빈 폼이 표시된다', async ({ page }) => {
  // Given — 빈 포트폴리오
  await page.route(PORTFOLIOS_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EMPTY_PORTFOLIO),
    });
  });

  // When
  await page.goto('/onboarding/portfolio');

  // Then — 스켈레톤 없음, 빈 폼 표시
  await expect(page.getByRole('region', { name: '파일 업로드 로딩 중' })).toHaveCount(0);

  // 링크 필드는 비어 있음
  await expect(page.getByLabel('Github')).toHaveValue('');
  await expect(page.getByLabel('Notion')).toHaveValue('');

  // 동의 체크박스 렌더링됨 (스켈레톤 아님)
  await expect(page.getByRole('checkbox')).toBeVisible();
});

test('AC6: GET 오류 시 스켈레톤이 제거되고 빈 폼 상태로 표시된다', async ({ page }) => {
  // Given — GET 500 에러
  await page.route(PORTFOLIOS_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'INTERNAL_SERVER_ERROR',
        code: 500,
        data: null,
        message: '서버 오류',
      }),
    });
  });

  // When
  await page.goto('/onboarding/portfolio');

  // Then — 스켈레톤 없음, 빈 폼 표시 (catch 정책: 빈 폼 유지)
  await expect(page.getByRole('region', { name: '파일 업로드 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '동의 로딩 중' })).toHaveCount(0);
  await expect(page.getByLabel('Github')).toHaveValue('');
});
