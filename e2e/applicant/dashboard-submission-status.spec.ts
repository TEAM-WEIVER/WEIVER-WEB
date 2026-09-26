import { type Page } from '@playwright/test';

import { test, expect } from '../fixtures/auth';
import { fulfillJson } from '../fixtures/msw-helpers';

/**
 * 지원자 대시보드 submission-status + AI 동기화 폴링 인수 테스트 (#100)
 *
 * AC9:    document-status 대신 submission-status API 호출 + 세 필드 개별 매핑 검증
 * AC10:   submission-status API 실패 시 에러 메시지
 * AC11:   syncStatus=REQUESTED 시 폴링 (10초 간격, 최대 2회) — fake clock 일관화 + 폴링 횟수 카운트
 * AC11:   syncStatus=FAILED 시 폴링 즉시 중단
 * AC12-a: submitted=true → 비활성 "제출 완료" 버튼 / submittable=false → profile/submit 미호출
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  SUBMISSION_STATUS: '**/api/applicants/submission-status',
  DOCUMENT_STATUS: '**/api/applicants/document-status',
  APPLICANTS: '**/api/applicants',
} as const;

// submission-status 응답 — 모든 항목 완료, 미제출
const SUBMISSION_STATUS_NOT_SUBMITTED = {
  status: 'OK',
  code: 200,
  data: {
    submitted: false,
    syncStatus: 'PENDING',
    submittable: true,
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
  },
  message: 'OK',
};

// submission-status 응답 — 이미 제출됨, REQUESTED 상태
const SUBMISSION_STATUS_REQUESTED = {
  status: 'OK',
  code: 200,
  data: {
    submitted: true,
    syncStatus: 'REQUESTED',
    submittable: false,
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
  },
  message: 'OK',
};

// submission-status 응답 — AI 분석 완료
const SUBMISSION_STATUS_COMPLETED = {
  status: 'OK',
  code: 200,
  data: {
    submitted: true,
    syncStatus: 'COMPLETED',
    submittable: false,
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
  },
  message: 'OK',
};

// submission-status 응답 — AI 분석 실패
const SUBMISSION_STATUS_FAILED = {
  status: 'OK',
  code: 200,
  data: {
    submitted: true,
    syncStatus: 'FAILED',
    submittable: false,
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
  },
  message: 'OK',
};

// submission-status 응답 — 항목 미완성, 미제출
const SUBMISSION_STATUS_INCOMPLETE = {
  status: 'OK',
  code: 200,
  data: {
    submitted: false,
    syncStatus: 'PENDING',
    submittable: false,
    resumeCompleted: false,
    essayCompleted: false,
    portfolioCompleted: false,
  },
  message: 'OK',
};

// submission-status 응답 — 각 항목 개별 완료/미완료 조합 테스트용
const SUBMISSION_STATUS_RESUME_ONLY = {
  status: 'OK',
  code: 200,
  data: {
    submitted: false,
    syncStatus: 'PENDING',
    submittable: false,
    resumeCompleted: true,
    essayCompleted: false,
    portfolioCompleted: false,
  },
  message: 'OK',
};

const SUBMISSION_STATUS_ESSAY_ONLY = {
  status: 'OK',
  code: 200,
  data: {
    submitted: false,
    syncStatus: 'PENDING',
    submittable: false,
    resumeCompleted: false,
    essayCompleted: true,
    portfolioCompleted: false,
  },
  message: 'OK',
};

const SUBMISSION_STATUS_PORTFOLIO_ONLY = {
  status: 'OK',
  code: 200,
  data: {
    submitted: false,
    syncStatus: 'PENDING',
    submittable: false,
    resumeCompleted: false,
    essayCompleted: false,
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
      address: '서울특별시 강남구',
      photoUrl: null,
    },
    EducationDTO: [],
    AwardDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
  },
  message: 'OK',
};

const SERVER_ERROR = {
  status: 'INTERNAL_SERVER_ERROR',
  code: 500,
  data: null,
  message: '서버 오류',
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

async function mockApplicantsGet(page: Page) {
  await page.route(API.APPLICANTS, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await fulfillJson(route, 200, APPLICANTS_OK);
  });
}

async function gotoDashboard(page: Page) {
  const loadResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.goto('/applicant/dashboard');
  await loadResponse;
}

// ---------------------------------------------------------------------------
// AC9: submission-status API 호출 + 세 필드 각각 개별 매핑 검증
// Major: resumeCompleted/essayCompleted/portfolioCompleted 각 필드 false→true 전환 시 UI 매핑
// ---------------------------------------------------------------------------

test('AC9: 대시보드 마운트 시 submission-status를 호출하고 (구) document-status는 호출하지 않는다', async ({
  page,
}) => {
  // Given — submission-status 성공 응답
  let submissionStatusCalled = false;
  let documentStatusCalled = false;

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    submissionStatusCalled = true;
    await fulfillJson(route, 200, SUBMISSION_STATUS_NOT_SUBMITTED);
  });

  await page.route(API.DOCUMENT_STATUS, async (route) => {
    documentStatusCalled = true;
    await fulfillJson(route, 200, {
      status: 'OK',
      code: 200,
      data: { resumeCompleted: true, essayCompleted: true, portfolioCompleted: true },
      message: 'OK',
    });
  });

  await mockApplicantsGet(page);

  // When — 대시보드 진입
  await gotoDashboard(page);

  // Then — submission-status 호출됨
  expect(submissionStatusCalled).toBe(true);

  // Then — (구) document-status는 호출되지 않음
  expect(documentStatusCalled).toBe(false);
});

test('AC9: resumeCompleted=true일 때 이력서 항목이 완료 상태로 표시된다', async ({ page }) => {
  // Given — 이력서만 완료된 상태
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_RESUME_ONLY);
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // Then — 이력서 항목이 완료 상태("작성완료" 텍스트)로 표시됨
  // ProfileStepCard: complete=true → '작성완료' 텍스트 / complete=false → '미작성' 텍스트
  const resumeItem = page
    .getByRole('listitem')
    .filter({ hasText: /이력서/ })
    .first();
  await expect(resumeItem).toBeVisible();
  await expect(resumeItem.getByText('작성완료')).toBeVisible();
});

test('AC9: essayCompleted=true일 때 자기소개서 항목이 완료 상태로 표시된다', async ({ page }) => {
  // Given — 자기소개서만 완료된 상태
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_ESSAY_ONLY);
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // Then — 자기소개서 완료 표시
  const essayItem = page
    .getByRole('listitem')
    .filter({ hasText: /자기소개서/ })
    .first();
  await expect(essayItem).toBeVisible();
  await expect(essayItem.getByText('작성완료')).toBeVisible();
});

test('AC9: portfolioCompleted=true일 때 포트폴리오 항목이 완료 상태로 표시된다', async ({
  page,
}) => {
  // Given — 포트폴리오만 완료된 상태
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_PORTFOLIO_ONLY);
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // Then — 포트폴리오 완료 표시
  const portfolioItem = page
    .getByRole('listitem')
    .filter({ hasText: /포트폴리오/ })
    .first();
  await expect(portfolioItem).toBeVisible();
  await expect(portfolioItem.getByText('작성완료')).toBeVisible();
});

test('AC9: 모든 항목 false일 때 이력서/자기소개서/포트폴리오 모두 미완료 상태로 표시된다', async ({
  page,
}) => {
  // Given — 모든 항목 미완료
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_INCOMPLETE);
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // Then — 페이지가 정상 렌더링됨 (미완료 상태 표시)
  await expect(page).toHaveURL('/applicant/dashboard');
  // ProfileStepCard는 complete=false일 때 '미작성' 텍스트를 표시함
  await expect(page.getByText('미작성').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC10: submission-status 조회 실패 시 에러 메시지
// ---------------------------------------------------------------------------

test('AC10: submission-status 조회 실패 시 에러 메시지를 표시한다', async ({ page }) => {
  // Given — submission-status 500 에러
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 500, SERVER_ERROR);
  });
  await page.route(API.APPLICANTS, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await fulfillJson(route, 500, SERVER_ERROR);
  });

  // When — 대시보드 진입 (에러 응답 대기)
  const errorResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.goto('/applicant/dashboard');
  await errorResponse;

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC11: syncStatus=REQUESTED 시 폴링 (10초 간격, 최대 2회)
// Major: fake clock 일관화 + waitForTimeout 혼용 제거 + 폴링 횟수 카운트 검증
//
// 참고: getApplicantProfileOverview()가 내부에서 getSubmissionStatus()를 호출하므로
// 페이지 마운트 시 submission-status가 최소 1회 호출된다.
// React 개발 환경(StrictMode)에서는 useEffect가 2회 실행되어 2회 호출될 수 있다.
// 따라서 초기 호출 횟수를 고정값으로 가정하지 않고, 폴링 후 증가분을 검증한다.
// ---------------------------------------------------------------------------

test('AC11: syncStatus가 REQUESTED이면 폴링이 시작된다 (fake clock, 10초 후 1차 폴링 발생)', async ({
  page,
}) => {
  // Given — fake clock을 goto 전에 설치하여 타이머 제어를 일관되게 적용
  await page.clock.install({ time: 0 });

  let callCount = 0;

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    callCount++;
    await fulfillJson(route, 200, SUBMISSION_STATUS_REQUESTED);
  });
  await mockApplicantsGet(page);

  // When
  await page.goto('/applicant/dashboard');
  await page.waitForLoadState('networkidle');
  const initialCallCount = callCount;

  // 10초 경과 시뮬레이션 (1차 폴링 트리거)
  const pollingResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.clock.fastForward(11_000);
  await pollingResponse;

  // Then — 폴링이 1회 발생했음 (초기 호출 이후 +1)
  expect(callCount).toBe(initialCallCount + 1);
});

test('AC11: syncStatus REQUESTED → COMPLETED로 전환되면 폴링을 중단한다 (fake clock, 폴링 횟수 검증)', async ({
  page,
}) => {
  // Given — fake clock을 goto 전에 설치하여 초기 로드 타이머도 제어
  await page.clock.install({ time: 0 });

  let callCount = 0;
  let returnCompleted = false;

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    callCount++;
    await fulfillJson(
      route,
      200,
      returnCompleted ? SUBMISSION_STATUS_COMPLETED : SUBMISSION_STATUS_REQUESTED,
    );
  });
  await mockApplicantsGet(page);

  await page.goto('/applicant/dashboard');

  // 초기 응답 대기 — 개발 환경 StrictMode double-invoke 포함한 모든 초기 호출 완료
  await page.waitForLoadState('networkidle');
  const initialCallCount = callCount;
  // StrictMode 여부와 관계없이 초기 로드는 REQUESTED, 첫 폴링부터 COMPLETED로 응답한다.
  returnCompleted = true;

  // 10초 경과 시뮬레이션 (1차 폴링 트리거)
  const pollingResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.clock.fastForward(11_000);
  await pollingResponse;

  // Then — 폴링이 1회 발생했음 (초기 호출 이후 +1)
  expect(callCount).toBe(initialCallCount + 1);

  // Then — 추가 폴링 없음 (20초 이상 경과해도 callCount 유지)
  await page.clock.fastForward(15_000);
  expect(callCount).toBe(initialCallCount + 1);
});

test('AC11: 2회 폴링 후에도 REQUESTED이면 폴링을 중단한다 (2회 후 callCount 고정)', async ({
  page,
}) => {
  // Given — fake clock을 goto 전에 설치하여 초기 로드 타이머도 제어
  await page.clock.install({ time: 0 });

  let callCount = 0;

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    callCount++;
    await fulfillJson(route, 200, SUBMISSION_STATUS_REQUESTED);
  });
  await mockApplicantsGet(page);

  await page.goto('/applicant/dashboard');

  // 초기 호출 완료 대기 (StrictMode 포함)
  await page.waitForLoadState('networkidle');
  const initialCallCount = callCount;

  // 10초 경과 → 1차 폴링
  const firstPollingResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.clock.fastForward(11_000);
  await firstPollingResponse;
  expect(callCount).toBe(initialCallCount + 1);

  // 10초 더 경과(총 20초) → 2차 폴링
  const secondPollingResponse = page.waitForResponse((response) =>
    response.url().includes('/api/applicants/submission-status'),
  );
  await page.clock.fastForward(11_000);
  await secondPollingResponse;
  expect(callCount).toBe(initialCallCount + 2);

  // Then — 이후 추가 폴링 없음 (폴링 중단 확인, callCount 고정)
  await page.clock.fastForward(20_000);
  expect(callCount).toBe(initialCallCount + 2);
});

// ---------------------------------------------------------------------------
// AC11 / syncStatus=FAILED: FAILED 상태일 때 폴링 즉시 중단
// SyncStatusBadge 제거로 배지 텍스트 검증은 제거, 폴링 중단만 callCount로 검증
// ---------------------------------------------------------------------------

test('syncStatus=FAILED일 때 폴링을 즉시 중단한다 (추가 submission-status 요청 없음)', async ({
  page,
}) => {
  // Given — fake clock을 goto 전에 설치하여 FAILED 수신 후 타이머도 제어
  await page.clock.install({ time: 0 });

  let callCount = 0;

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    callCount++;
    await fulfillJson(route, 200, SUBMISSION_STATUS_FAILED);
  });
  await mockApplicantsGet(page);

  await page.goto('/applicant/dashboard');

  // 초기 호출 완료 대기 (StrictMode 포함)
  await page.waitForLoadState('networkidle');
  const initialCallCount = callCount;

  // 폴링 간격(10초, 20초) 이상 경과해도 추가 호출 없어야 함
  await page.clock.fastForward(25_000);

  // Then — FAILED 수신 후 폴링 즉시 중단 (초기 호출 이후 callCount 증가 없음)
  expect(callCount).toBe(initialCallCount);
});

// ---------------------------------------------------------------------------
// AC12-a: submitted=true → 비활성 "제출 완료" 버튼 / submittable=false → profile/submit 미호출
// ---------------------------------------------------------------------------

test('AC12-a: submitted=true이면 비활성 "제출 완료" 버튼이 표시된다', async ({ page }) => {
  // Given — 이미 제출된 상태
  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_REQUESTED);
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // Then — "제출 완료" 버튼이 disabled 상태로 표시됨
  const submitDoneButton = page.getByRole('button', { name: '제출 완료' });
  await expect(submitDoneButton).toBeVisible();
  await expect(submitDoneButton).toBeDisabled();

  // Then — 활성 "프로필 제출" 버튼은 없음
  await expect(page.getByRole('button', { name: '프로필 제출' })).toHaveCount(0);
});

test('AC12-a: submittable=false이면 POST /api/applicants/profile/submit이 발생하지 않는다', async ({
  page,
}) => {
  let submitCalled = false;

  // fake clock을 goto 전에 설치하여 초기 로드 타이머부터 제어
  await page.clock.install({ time: 0 });

  await page.route(API.SUBMISSION_STATUS, async (route) => {
    await fulfillJson(route, 200, SUBMISSION_STATUS_REQUESTED);
  });
  await page.route('**/api/applicants/profile/submit', async (route) => {
    submitCalled = true;
    await fulfillJson(route, 200, { status: 'OK', code: 200, data: null, message: 'OK' });
  });
  await mockApplicantsGet(page);

  await gotoDashboard(page);

  // 자동 호출이 있다면 포착할 수 있도록 fake clock으로 일정 시간 진행
  await page.clock.fastForward(2_000);

  // Then — 자동 제출 API 미호출
  expect(submitCalled).toBe(false);
});
