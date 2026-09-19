/**
 * 기업 대시보드 JobPostingList 스켈레톤 인수 테스트 (#87)
 *
 * 커버 AC: AC9, AC10
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `/corporate/dashboard` 라우트가 존재한다.
 * - Playwright 설정은 production server를 사용하므로 sessionStorage에 COMPANY 역할을 주입한다.
 *
 * 목킹 전략:
 * - Playwright page.route()로 API 응답을 직접 가로채 지연/즉시 응답을 시뮬레이션한다.
 * - 기업 인증 상태는 sessionStorage에 COMPANY 역할을 주입하여 설정한다.
 */

import { test, expect, type Page } from '@playwright/test';

import {
  MOCK_JOB_POSTINGS_SUMMARY,
  MOCK_COMPANY_DASHBOARD,
  MOCK_COMPANY_INFO,
} from '../mocks/corporate-dashboard-fixtures';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

const DASHBOARD_URL = '/corporate/dashboard';
const AUTH_ROLE_STORAGE_KEY = 'weiver.auth.role';

const apiResponse = <TData>(data: TData) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

// ──────────────────────────────────────────────
// 헬퍼: 기업 담당자 인증 상태 주입
// ──────────────────────────────────────────────

async function mockCorporateAuth(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      window.sessionStorage.setItem(storageKey, 'COMPANY');
    },
    { storageKey: AUTH_ROLE_STORAGE_KEY },
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ csrfToken: 'mock-csrf-token' })),
    }),
  );

  await page.route('**/api/auth/reissue', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({ accessToken: 'mock-access-token' })),
    }),
  );
}

// ──────────────────────────────────────────────
// 헬퍼: 보조 API 목킹 (회사 정보, 알림 — 즉시 응답)
// ──────────────────────────────────────────────

async function mockSupportApis(page: Page) {
  await page.route('**/api/dashboards/company', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse(MOCK_COMPANY_DASHBOARD)),
    }),
  );

  await page.route('**/api/companies/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse(MOCK_COMPANY_INFO)),
    }),
  );

  await page.route('**/api/dashboards/notifications', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse({})),
    }),
  );
}

// ──────────────────────────────────────────────
// AC9: JobPostingList 로딩 중 스켈레톤 표시
// ──────────────────────────────────────────────

test.describe('AC9: JobPostingList 로딩 중 스켈레톤 표시', () => {
  test('채용공고 API 요청 진행 중에 스켈레톤이 렌더링된다', async ({ page }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 채용공고 API는 응답을 지연시켜 로딩 상태를 유지
    await page.route('**/api/dashboards/job-postings**', async (route) => {
      // 충분한 지연을 주어 스켈레톤을 관찰할 수 있도록 한다
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      });
    });

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then: 채용공고 로딩 중 스켈레톤이 표시된다
    const skeleton = page.getByLabel('채용공고 로딩 중');
    await expect(skeleton).toBeVisible({ timeout: 5000 });
  });

  test('로딩 중에는 "등록된 공고가 없습니다" 빈 상태 메시지가 표시되지 않는다', async ({
    page,
  }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 채용공고 API 응답 지연
    await page.route('**/api/dashboards/job-postings**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      });
    });

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then: 스켈레톤이 보이는 동안 빈 상태 메시지가 없다
    await expect(page.getByLabel('채용공고 로딩 중')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('등록된 공고가 없습니다.')).not.toBeVisible();
  });

  test('스켈레톤 섹션에 aria-label="채용공고 로딩 중" 속성이 포함된다', async ({ page }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 채용공고 API 응답 지연
    await page.route('**/api/dashboards/job-postings**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      });
    });

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then: aria-label 속성을 가진 스켈레톤 요소가 DOM에 존재한다
    const skeleton = page.locator('[aria-label="채용공고 로딩 중"]');
    await expect(skeleton).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// AC10: API 완료 후 실제 JobPostingList 렌더링
// ──────────────────────────────────────────────

test.describe('AC10: API 완료 후 실제 JobPostingList 렌더링', () => {
  test('API 응답 도착 후 스켈레톤이 제거되고 실제 채용공고 목록이 렌더링된다', async ({ page }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 채용공고 API 응답이 짧은 지연 후 도착
    await page.route('**/api/dashboards/job-postings**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      });
    });

    // When: 기업 대시보드에 진입 후 API 응답 대기
    await page.goto(DASHBOARD_URL);

    // Then: 스켈레톤이 사라지고 실제 채용공고 제목이 표시된다
    await expect(page.getByLabel('채용공고 로딩 중')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '프론트엔드 개발자' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('API 응답 도착 후 목 데이터의 공고 2건 이상이 화면에 표시된다', async ({ page }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 채용공고 API 즉시 응답
    await page.route('**/api/dashboards/job-postings**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      }),
    );

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then: 3개의 채용공고가 렌더링된다
    await expect(page.getByRole('heading', { name: '프론트엔드 개발자' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: '백엔드 개발자' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('heading', { name: 'UX 디자이너' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('공고가 없을 때 API 완료 후 "등록된 공고가 없습니다" 메시지가 표시된다', async ({
    page,
  }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    // Given: 빈 채용공고 목록 응답
    await page.route('**/api/dashboards/job-postings**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiResponse({
            content: [],
            pageable: { pageNumber: 0, pageSize: 3, totalElements: 0, totalPages: 0 },
          }),
        ),
      }),
    );

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then: 스켈레톤이 제거되고 빈 상태 메시지가 표시된다
    await expect(page.getByLabel('채용공고 로딩 중')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('등록된 공고가 없습니다.')).toBeVisible({ timeout: 5000 });
  });

  test('로딩 전환 — 스켈레톤 표시 후 실제 데이터로 전환된다', async ({ page }) => {
    // Given: 인증된 기업 담당자
    await mockCorporateAuth(page);
    await mockSupportApis(page);

    let resolveJobPostings!: () => void;
    const jobPostingsPromise = new Promise<void>((resolve) => {
      resolveJobPostings = resolve;
    });

    // Given: 수동으로 제어 가능한 채용공고 API 응답
    await page.route('**/api/dashboards/job-postings**', async (route) => {
      await jobPostingsPromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(MOCK_JOB_POSTINGS_SUMMARY)),
      });
    });

    // When: 기업 대시보드에 진입
    await page.goto(DASHBOARD_URL);

    // Then (로딩 중): 스켈레톤이 보인다
    await expect(page.getByLabel('채용공고 로딩 중')).toBeVisible({ timeout: 5000 });

    // When: API 응답 완료
    resolveJobPostings();

    // Then (로딩 완료): 스켈레톤이 사라지고 실제 데이터가 렌더링된다
    await expect(page.getByLabel('채용공고 로딩 중')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '프론트엔드 개발자' })).toBeVisible({
      timeout: 5000,
    });
  });
});
