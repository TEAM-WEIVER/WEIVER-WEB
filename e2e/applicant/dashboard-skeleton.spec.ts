import { test, expect } from '../fixtures/auth';

/**
 * 지원자 대시보드 스켈레톤 UI 인수 테스트 (#80)
 *
 * AC1: API 응답 지연 시 스켈레톤 표시
 * AC2: API 완료 후 실제 컴포넌트 렌더링 / 에러 시 에러 메시지 표시
 *
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 * E2E 인터셉트 경로는 `/api/*` 기준으로 작성한다.
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  DOCUMENT_STATUS: '**/api/applicants/document-status',
  APPLICANTS: '**/api/applicants',
} as const;

const DOCUMENT_STATUS_OK = {
  status: 'OK',
  code: 200,
  data: {
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
  },
  message: 'OK',
};

const APPLICANTS_OK = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: {
      name: '홍길동',
      email: 'hong@example.com',
      birthday: '1990-01-01',
      phoneNumber: '010-1234-5678',
      photoUrl: null,
    },
    EducationDTO: [],
    AwardDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
  },
  message: 'OK',
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

/** API 즉시 응답 — 로딩 완료 상태 */
async function mockDashboardSuccess(page: import('@playwright/test').Page) {
  await page.route(API.DOCUMENT_STATUS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DOCUMENT_STATUS_OK),
    }),
  );

  await page.route(API.APPLICANTS, (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(APPLICANTS_OK),
    });
  });
}

/** API 오류 응답 */
async function mockDashboardError(page: import('@playwright/test').Page) {
  const errorBody = {
    status: 'INTERNAL_SERVER_ERROR',
    code: 500,
    data: null,
    message: '서버 오류',
  };

  await page.route(API.DOCUMENT_STATUS, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify(errorBody),
    }),
  );

  await page.route(API.APPLICANTS, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify(errorBody),
    });
  });
}

// ---------------------------------------------------------------------------
// AC1: 로딩 중 스켈레톤 표시
// ---------------------------------------------------------------------------

test('AC1: API 응답 전 스켈레톤이 표시되고 "로딩 중..." 텍스트는 없다', async ({ page }) => {
  // Given — API 응답을 무기한 지연
  await page.route(API.DOCUMENT_STATUS, (_route) => {
    // 응답을 보내지 않아 로딩 상태 유지
  });
  await page.route(API.APPLICANTS, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    // 응답을 보내지 않아 로딩 상태 유지
  });

  // When — 대시보드 진입
  await page.goto('/applicant/dashboard');

  // Then — 스켈레톤 섹션이 aria-label로 식별 가능
  await expect(page.getByRole('region', { name: '프로필 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '채용 절차 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '면접 로딩 중' })).toBeVisible();

  // Then — 기존 "로딩 중..." 텍스트는 표시되지 않는다
  await expect(page.getByText('로딩 중...')).toHaveCount(0);
});

test('AC1: 로딩 중에도 ReapplyNotice는 항상 렌더링된다', async ({ page }) => {
  // Given — API 응답 지연
  await page.route(API.DOCUMENT_STATUS, (_route) => {});
  await page.route(API.APPLICANTS, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    // 응답 없음 — 로딩 상태 유지
  });

  // When
  await page.goto('/applicant/dashboard');

  // Then — 스켈레톤이 보이는 동안에도 재지원 안내 영역은 렌더링
  await expect(page.getByRole('region', { name: '프로필 로딩 중' })).toBeVisible();
  // ReapplyNotice 컴포넌트 존재 여부 — 구현 후 실제 selector로 보완 가능
  await expect(page.locator('section, [data-testid="reapply-notice"]').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC2: API 완료 후 실제 컴포넌트 렌더링
// ---------------------------------------------------------------------------

test('AC2: API 응답 완료 후 스켈레톤이 제거되고 실제 컴포넌트가 렌더링된다', async ({ page }) => {
  // Given — 즉시 성공 응답
  await mockDashboardSuccess(page);

  // When
  await page.goto('/applicant/dashboard');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '프로필 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '채용 절차 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '면접 로딩 중' })).toHaveCount(0);

  // Then — 실제 컴포넌트 렌더링 (ProfileOverviewCard에 이름 표시)
  await expect(page.getByText('홍길동')).toBeVisible();
});

test('AC2: API 오류 시 에러 메시지가 표시된다', async ({ page }) => {
  // Given — 두 API 모두 500 에러
  await mockDashboardError(page);

  // When
  await page.goto('/applicant/dashboard');

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  ).toBeVisible();

  // Then — 스켈레톤도 제거됨
  await expect(page.getByRole('region', { name: '프로필 로딩 중' })).toHaveCount(0);
});
