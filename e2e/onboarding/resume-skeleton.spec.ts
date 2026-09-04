import { test, expect } from '../fixtures/auth';

/**
 * 이력서 온보딩 스켈레톤 UI 인수 테스트 (#80)
 *
 * AC7: API 응답 지연 시 각 섹션 스켈레톤 + 버튼 disabled
 * AC8: API 완료 후 실제 컴포넌트 렌더링 / GET 오류 시 빈 폼 표시
 *
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const APPLICANTS_API = '**/api/applicants';

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
      address: '서울특별시 강남구',
    },
    EducationDTO: [],
    AwardDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
  },
  message: 'OK',
};

const EMPTY_RESUME = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: null,
    EducationDTO: [],
    AwardDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
  },
  message: 'OK',
};

// ---------------------------------------------------------------------------
// AC7: 로딩 중 스켈레톤 + 버튼 disabled
// ---------------------------------------------------------------------------

test('AC7: GET 응답 전 이력서 각 섹션이 스켈레톤으로 표시된다', async ({ page }) => {
  // Given — GET 응답 무기한 지연
  await page.route(APPLICANTS_API, (route) => {
    if (route.request().method() === 'GET') return; // 응답 없음 — 로딩 유지
    return route.continue();
  });

  // When
  await page.goto('/onboarding/resume');

  // Then — 각 섹션 스켈레톤 (aria-label로 식별)
  await expect(page.getByRole('region', { name: '기본 정보 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '학력 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '자격증 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '수상 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '경력 로딩 중' })).toBeVisible();
});

test('AC7: 로딩 중 "나중에 작성", "다음" 버튼이 모두 비활성화된다', async ({ page }) => {
  // Given — GET 응답 지연
  await page.route(APPLICANTS_API, (route) => {
    if (route.request().method() === 'GET') return;
    return route.continue();
  });

  // When
  await page.goto('/onboarding/resume');

  // Then
  await expect(page.getByRole('button', { name: '나중에 작성' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC8: API 완료 후 실제 컴포넌트 렌더링
// ---------------------------------------------------------------------------

test('AC8: GET 응답 완료 후 스켈레톤이 제거되고 모든 섹션 컴포넌트가 렌더링된다', async ({
  page,
}) => {
  // Given — 기존 데이터 있음
  await page.route(APPLICANTS_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(APPLICANTS_OK),
    });
  });

  // When
  await page.goto('/onboarding/resume');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '기본 정보 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '학력 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '자격증 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '수상 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '경력 로딩 중' })).toHaveCount(0);

  // Then — 기존 데이터가 폼 필드에 채워짐 (reset()으로 prefill)
  await expect(page.getByLabel('이름')).toHaveValue('홍길동');
  await expect(page.getByLabel('이메일')).toHaveValue('hong@example.com');
  await expect(page.getByLabel('전화번호')).toHaveValue('010-1234-5678');
});

test('AC8: GET 응답 완료 후 빈 이력서면 빈 폼이 표시되고 다음 버튼은 비활성화된다', async ({
  page,
}) => {
  // Given — 빈 이력서
  await page.route(APPLICANTS_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(EMPTY_RESUME),
    });
  });

  // When
  await page.goto('/onboarding/resume');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '기본 정보 로딩 중' })).toHaveCount(0);

  // Then — 빈 폼 표시
  await expect(page.getByLabel('이름')).toHaveValue('');

  // Then — 필수 항목 미입력 상태이므로 다음 버튼 비활성화
  await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();

  // Then — 나중에 작성 버튼은 활성화
  await expect(page.getByRole('button', { name: '나중에 작성' })).toBeEnabled();
});

test('AC8: GET 오류 시 스켈레톤이 제거되고 빈 폼 상태로 표시된다', async ({ page }) => {
  // Given — GET 500 에러
  await page.route(APPLICANTS_API, (route) => {
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
  await page.goto('/onboarding/resume');

  // Then — 스켈레톤 없음 (catch 정책: 빈 폼 유지)
  await expect(page.getByRole('region', { name: '기본 정보 로딩 중' })).toHaveCount(0);
  await expect(page.getByLabel('이름')).toHaveValue('');
});
