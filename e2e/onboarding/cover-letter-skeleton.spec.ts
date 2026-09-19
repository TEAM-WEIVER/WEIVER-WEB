import { test, expect } from '../fixtures/auth';

/**
 * 자기소개서 온보딩 스켈레톤 UI 인수 테스트 (#80)
 *
 * AC3: API 응답 지연 시 CoverLetterQuestionField 3개 영역 스켈레톤 + 버튼 disabled
 * AC4: API 완료 후 실제 폼 렌더링 / GET 오류 시 빈 폼 표시
 *
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const ESSAY_API = '**/api/essay-answers';

const ESSAY_WITH_DATA = {
  status: 'OK',
  code: 200,
  data: {
    answers: [
      {
        answerId: 1,
        questionId: 1,
        sequence: 1,
        question:
          '원하는 분야에 관심을 갖게 된 계기와 자신 있는 이유에 대해 구체적으로 설명해주세요.',
        maxLength: 1000,
        answer: '첫 번째 자기소개서 답변입니다.',
      },
      {
        answerId: 2,
        questionId: 2,
        sequence: 2,
        question:
          '가장 열정을 가지고 임했던 프로젝트를 소개해주시고, 수행 과정 및 결과를 기재해주세요.',
        maxLength: 1000,
        answer: '두 번째 자기소개서 답변입니다.',
      },
      {
        answerId: 3,
        questionId: 3,
        sequence: 3,
        question: '입사 후 회사에서 이루고 싶은 꿈을 적어주세요.',
        maxLength: 500,
        answer: '세 번째 자기소개서 답변입니다.',
      },
    ],
  },
  message: 'OK',
};

// ---------------------------------------------------------------------------
// AC3: 로딩 중 스켈레톤 + 버튼 disabled
// ---------------------------------------------------------------------------

test('AC3: GET 응답 전 자기소개서 스켈레톤 3개가 표시된다', async ({ page }) => {
  // Given — GET 응답을 무기한 지연
  await page.route(ESSAY_API, (route) => {
    if (route.request().method() === 'GET') return; // 응답 없음 — 로딩 유지
    return route.continue();
  });

  // When
  await page.goto('/onboarding/cover-letter');

  // Then — 스켈레톤 3개 렌더링 (aria-label로 식별)
  await expect(page.getByRole('region', { name: '자기소개서 1번 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '자기소개서 2번 로딩 중' })).toBeVisible();
  await expect(page.getByRole('region', { name: '자기소개서 3번 로딩 중' })).toBeVisible();
});

test('AC3: 로딩 중 "이전 단계", "나중에 작성", "다음" 버튼이 모두 비활성화된다', async ({
  page,
}) => {
  // Given — GET 응답 지연
  await page.route(ESSAY_API, (route) => {
    if (route.request().method() === 'GET') return;
    return route.continue();
  });

  // When
  await page.goto('/onboarding/cover-letter');

  // Then — 세 버튼 모두 disabled
  await expect(page.getByRole('button', { name: '이전 단계' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '나중에 작성' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC4: API 완료 후 실제 컴포넌트 렌더링
// ---------------------------------------------------------------------------

test('AC4: GET 응답 완료 후 스켈레톤이 제거되고 CoverLetterQuestionField 3개가 렌더링된다', async ({
  page,
}) => {
  // Given — 기존 데이터 있음
  await page.route(ESSAY_API, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ESSAY_WITH_DATA),
    });
  });

  // When
  await page.goto('/onboarding/cover-letter');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '자기소개서 1번 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '자기소개서 2번 로딩 중' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '자기소개서 3번 로딩 중' })).toHaveCount(0);

  // Then — 기존 데이터가 폼 필드에 채워짐
  await expect(page.getByLabel(/1\./)).toHaveValue('첫 번째 자기소개서 답변입니다.');
  await expect(page.getByLabel(/2\./)).toHaveValue('두 번째 자기소개서 답변입니다.');
  await expect(page.getByLabel(/3\./)).toHaveValue('세 번째 자기소개서 답변입니다.');

  // Then — 버튼 활성화
  await expect(page.getByRole('button', { name: '이전 단계' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '나중에 작성' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();
});

test('AC4: GET 오류 시 스켈레톤이 제거되고 빈 폼이 표시된다', async ({ page }) => {
  // Given — GET 500 에러
  await page.route(ESSAY_API, (route) => {
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
  await page.goto('/onboarding/cover-letter');

  // Then — 스켈레톤 없음
  await expect(page.getByRole('region', { name: '자기소개서 1번 로딩 중' })).toHaveCount(0);

  // Then — 빈 폼 표시 (catch 정책: 빈 폼 유지)
  await expect(page.getByLabel(/1\./)).toHaveValue('');
  await expect(page.getByLabel(/2\./)).toHaveValue('');
  await expect(page.getByLabel(/3\./)).toHaveValue('');
});
