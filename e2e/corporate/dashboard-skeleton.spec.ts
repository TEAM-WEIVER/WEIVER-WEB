import { type Page } from '@playwright/test';

import { corporateTest as test, expect } from '../fixtures/auth';

/**
 * 기업 대시보드 채용공고 스켈레톤 UI 인수 테스트 (#80)
 *
 * AC9: API 응답 지연 시 JobPostingList 영역 스켈레톤 표시
 * AC10: API 완료 후 실제 JobPostingList 렌더링
 *
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  COMPANY_DASHBOARD: '**/api/dashboards/company',
  JOB_POSTINGS: '**/api/dashboards/job-postings**',
  NOTIFICATIONS: '**/api/dashboards/notifications',
  MY_COMPANY: '**/api/companies/my',
} as const;

const COMPANY_DASHBOARD_OK = {
  status: 'OK',
  code: 200,
  data: {
    companyId: 1,
    companyLogoUrl: null,
    companyCeoName: '김대표',
    address: '서울특별시 강남구',
    employeeNum: 50,
    foundedYear: 2020,
    wayOfWorkingDetail: {
      workPace: '빠른 실행',
      decisionMaking: '팀 합의',
      roleDefinition: '명확한 역할',
      operationStyle: '실험 지향',
    },
  },
  message: 'OK',
};

const MY_COMPANY_OK = {
  status: 'OK',
  code: 200,
  data: {
    companyId: 1,
    companyName: '위버 주식회사',
    companyLogoUrl: null,
    companyType: 'STARTUP',
    companyCeoName: '김대표',
    address: '서울특별시 강남구',
    employeeNum: 50,
    foundedYear: 2020,
    workPace: 'FAST_EXECUTION',
    decisionMaking: 'TEAM_CONSENSUS',
    roleDefinition: 'CLEAR_RESPONSIBILITY',
    operationStyle: 'EXPERIMENT_ORIENTED',
  },
  message: 'OK',
};

const JOB_POSTINGS_OK = {
  status: 'OK',
  code: 200,
  data: {
    content: [
      {
        jobPostingId: 1,
        title: '프론트엔드 개발자',
        status: 'ACTIVE',
        deadline: '2026-12-31',
        applicantCount: 10,
      },
      {
        jobPostingId: 2,
        title: '백엔드 개발자',
        status: 'ACTIVE',
        deadline: '2026-12-31',
        applicantCount: 5,
      },
    ],
    totalElements: 2,
    totalPages: 1,
    size: 3,
    number: 0,
  },
  message: 'OK',
};

const JOB_POSTINGS_EMPTY = {
  status: 'OK',
  code: 200,
  data: {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 3,
    number: 0,
  },
  message: 'OK',
};

const NOTIFICATIONS_OK = {
  status: 'OK',
  code: 200,
  data: {},
  message: 'OK',
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

/** 기업 대시보드 공통 API (CompanySummary + Notification)를 정상 응답으로 모킹 */
async function mockCommonDashboardApis(page: Page) {
  await page.route(API.COMPANY_DASHBOARD, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(COMPANY_DASHBOARD_OK),
    }),
  );

  await page.route(API.MY_COMPANY, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MY_COMPANY_OK),
    }),
  );

  await page.route(API.NOTIFICATIONS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(NOTIFICATIONS_OK),
    }),
  );
}

// ---------------------------------------------------------------------------
// AC9: 로딩 중 스켈레톤 표시
// ---------------------------------------------------------------------------

test('AC9: 채용공고 API 응답 전 JobPostingList 영역에 스켈레톤이 표시된다', async ({ page }) => {
  // Given — 공통 API는 즉시 응답, 채용공고 API만 지연
  await mockCommonDashboardApis(page);
  await page.route(API.JOB_POSTINGS, (_route) => {
    // 응답 없음 — 로딩 상태 유지
  });

  // When
  await page.goto('/corporate/dashboard');

  // Then — 채용공고 스켈레톤 영역 표시 (aria-label로 식별)
  await expect(page.getByRole('region', { name: '채용공고 로딩 중' })).toBeVisible();
});

test('AC9: 채용공고 로딩 중 "등록된 공고가 없습니다" 빈 상태 메시지가 표시되지 않는다', async ({
  page,
}) => {
  // Given — 채용공고 API 지연
  await mockCommonDashboardApis(page);
  await page.route(API.JOB_POSTINGS, (_route) => {
    // 응답 없음
  });

  // When
  await page.goto('/corporate/dashboard');

  // Then — 빈 상태 메시지 없음 (로딩 중이므로)
  await expect(page.getByText('등록된 공고가 없습니다')).toHaveCount(0);

  // Then — 스켈레톤 표시됨
  await expect(page.getByRole('region', { name: '채용공고 로딩 중' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC10: API 완료 후 실제 JobPostingList 렌더링
// ---------------------------------------------------------------------------

test('AC10: 채용공고 API 완료 후 스켈레톤이 제거되고 실제 채용공고 목록이 렌더링된다', async ({
  page,
}) => {
  // Given — 모든 API 즉시 응답
  await mockCommonDashboardApis(page);
  await page.route(API.JOB_POSTINGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(JOB_POSTINGS_OK),
    }),
  );

  // When
  await page.goto('/corporate/dashboard');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '채용공고 로딩 중' })).toHaveCount(0);

  // Then — 실제 채용공고 목록 표시
  await expect(page.getByText('프론트엔드 개발자')).toBeVisible();
  await expect(page.getByText('백엔드 개발자')).toBeVisible();
});

test('AC10: 채용공고 데이터가 없을 때 빈 상태 메시지가 표시된다', async ({ page }) => {
  // Given — 빈 채용공고 목록
  await mockCommonDashboardApis(page);
  await page.route(API.JOB_POSTINGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(JOB_POSTINGS_EMPTY),
    }),
  );

  // When
  await page.goto('/corporate/dashboard');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '채용공고 로딩 중' })).toHaveCount(0);

  // Then — 빈 상태 메시지 표시 (로딩 완료 후에만 표시)
  await expect(page.getByText('등록된 공고가 없습니다')).toBeVisible();
});
