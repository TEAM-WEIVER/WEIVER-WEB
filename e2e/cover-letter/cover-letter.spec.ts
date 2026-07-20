import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * 자기소개서 온보딩 인수 테스트 (#42)
 *
 * page.route()로 API를 인터셉트한다.
 * Next.js rewrites: /api/* → https://api.piuda.site/api/*
 * E2E 인터셉트 경로는 **/ api; /* 기준으로 작성한다.
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  ESSAY_GET: '**/api/essay-answers',
  ESSAY_POST: '**/api/essay-answers',
  ESSAY_PUT: '**/api/essay-answers',
} as const;

// GET 성공 — 기존 답변 있음 (sequence 정렬 대상)
const ESSAY_WITH_DATA = {
  status: 'OK',
  code: 200,
  data: {
    answers: [
      {
        answerId: 3,
        questionId: 3,
        sequence: 3,
        question: '입사 후 회사에서 이루고 싶은 꿈을 적어주세요.',
        maxLength: 500,
        answer: '세 번째 자기소개서 답변입니다.',
      },
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
    ],
  },
  message: 'OK',
};

// GET 성공 — 빈 배열 (첫 방문)
const ESSAY_EMPTY = {
  status: 'OK',
  code: 200,
  data: { answers: [] },
  message: 'OK',
};

// POST/PUT 성공
const SAVE_SUCCESS = {
  status: 'OK',
  code: 200,
  data: {},
  message: 'OK',
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

async function mockRoute(
  page: Page,
  url: string,
  method: 'GET' | 'POST' | 'PUT',
  fixture: { status: number; body: object },
) {
  await page.route(url, (route: Route) => {
    if (route.request().method() !== method) {
      route.continue();
      return;
    }
    route.fulfill({
      status: fixture.status,
      contentType: 'application/json',
      body: JSON.stringify(fixture.body),
    });
  });
}

/** 인증된 사용자 상태로 커버레터 페이지 진입 */
async function gotoCoverLetterWithAuth(page: Page) {
  // localStorage에 accessToken을 주입한 뒤 페이지를 로드한다.
  await page.goto('/onboarding/cover-letter');
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });
  await page.goto('/onboarding/cover-letter');
}

// ---------------------------------------------------------------------------
// AC1: 기존 데이터 prefill
// ---------------------------------------------------------------------------

test('AC1: GET 응답의 answers가 sequence 오름차순으로 각 textarea에 채워진다', async ({ page }) => {
  // Given — 서버에 기존 답변이 저장된 상태
  await mockRoute(page, API.ESSAY_GET, 'GET', { status: 200, body: ESSAY_WITH_DATA });
  await gotoCoverLetterWithAuth(page);

  // Then — sequence 1 답변이 첫 번째 textarea에, 2가 두 번째, 3이 세 번째에 채워진다
  // 레이블은 cover-letter-question-field.tsx의 <label htmlFor="cover-letter-question1"> 패턴
  const q1Textarea = page.getByLabel(/1\./);
  const q2Textarea = page.getByLabel(/2\./);
  const q3Textarea = page.getByLabel(/3\./);

  await expect(q1Textarea).toHaveValue('첫 번째 자기소개서 답변입니다.');
  await expect(q2Textarea).toHaveValue('두 번째 자기소개서 답변입니다.');
  await expect(q3Textarea).toHaveValue('세 번째 자기소개서 답변입니다.');
});

// ---------------------------------------------------------------------------
// AC2: 첫 방문 — GET 성공 + 빈 배열 → 빈 폼
// ---------------------------------------------------------------------------

test('AC2: GET 성공이지만 answers가 빈 배열이면 모든 textarea가 빈 값으로 표시된다', async ({
  page,
}) => {
  // Given — 서버 응답은 성공이지만 answers가 []
  await mockRoute(page, API.ESSAY_GET, 'GET', { status: 200, body: ESSAY_EMPTY });
  await gotoCoverLetterWithAuth(page);

  // Then — 세 textarea 모두 빈 값
  await expect(page.getByLabel(/1\./)).toHaveValue('');
  await expect(page.getByLabel(/2\./)).toHaveValue('');
  await expect(page.getByLabel(/3\./)).toHaveValue('');
});

// ---------------------------------------------------------------------------
// AC3: 최초 저장 — POST 호출 확인
// ---------------------------------------------------------------------------

test('AC3: essayCompletedRef=false 상태에서 다음 클릭 시 POST /api/essay-answers가 호출된다', async ({
  page,
}) => {
  // Given — 첫 방문 (빈 배열)
  await mockRoute(page, API.ESSAY_GET, 'GET', { status: 200, body: ESSAY_EMPTY });

  let postCalled = false;
  let putCalled = false;

  await page.route('**/api/essay-answers', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ESSAY_EMPTY),
      });
      return;
    }
    if (method === 'POST') {
      postCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAVE_SUCCESS),
      });
      return;
    }
    if (method === 'PUT') {
      putCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAVE_SUCCESS),
      });
      return;
    }
    route.continue();
  });

  await gotoCoverLetterWithAuth(page);

  // When — 내용 입력 후 다음 버튼 클릭
  await page.getByLabel(/1\./).fill('첫 번째 답변');
  await page.getByRole('button', { name: '다음' }).click();

  // Then — POST 호출, PUT 미호출, 다음 페이지로 이동
  await expect(page).toHaveURL('/onboarding/portfolio');
  expect(postCalled).toBe(true);
  expect(putCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// AC4: 수정 저장 — PUT 호출 확인
// ---------------------------------------------------------------------------

test('AC4: essayCompletedRef=true 상태에서 다음 클릭 시 PUT /api/essay-answers가 호출된다', async ({
  page,
}) => {
  // Given — 기존 데이터가 있어 essayCompletedRef=true로 설정됨

  let postCalled = false;
  let putCalled = false;

  await page.route('**/api/essay-answers', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ESSAY_WITH_DATA),
      });
      return;
    }
    if (method === 'POST') {
      postCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAVE_SUCCESS),
      });
      return;
    }
    if (method === 'PUT') {
      putCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAVE_SUCCESS),
      });
      return;
    }
    route.continue();
  });

  await gotoCoverLetterWithAuth(page);

  // prefill 확인 후
  await expect(page.getByLabel(/1\./)).toHaveValue('첫 번째 자기소개서 답변입니다.');

  // When — 내용 수정 후 다음 버튼 클릭
  await page.getByLabel(/1\./).fill('수정된 첫 번째 답변');
  await page.getByRole('button', { name: '다음' }).click();

  // Then — PUT 호출, POST 미호출, 다음 페이지로 이동
  await expect(page).toHaveURL('/onboarding/portfolio');
  expect(putCalled).toBe(true);
  expect(postCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// AC6: 저장 실패 — 에러 메시지 표시, 페이지 유지
// ---------------------------------------------------------------------------

test('AC6: POST/PUT 실패 시 role=alert 에러 메시지가 표시되고 페이지가 유지된다', async ({
  page,
}) => {
  // Given — GET 성공(빈 배열), POST 실패(500)
  await page.route('**/api/essay-answers', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ESSAY_EMPTY),
      });
      return;
    }
    if (method === 'POST') {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'INTERNAL_SERVER_ERROR',
          code: 500,
          data: null,
          message: '서버 오류',
        }),
      });
      return;
    }
    route.continue();
  });

  await gotoCoverLetterWithAuth(page);

  // When — 다음 버튼 클릭
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 에러 메시지 표시
  await expect(page.getByRole('alert')).toContainText(
    '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
  );

  // Then — 페이지 유지 (리다이렉트 없음)
  await expect(page).toHaveURL('/onboarding/cover-letter');
});

// ---------------------------------------------------------------------------
// AC7: GET 실패 → 빈 폼 표시 + POST 허용
// ---------------------------------------------------------------------------

test('AC7: GET 실패 시 빈 폼이 표시되고 에러 없이 POST로 진행할 수 있다', async ({ page }) => {
  // Given — GET 500 에러
  await page.route('**/api/essay-answers', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'INTERNAL_SERVER_ERROR',
          code: 500,
          data: null,
          message: '서버 오류',
        }),
      });
      return;
    }
    if (method === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAVE_SUCCESS),
      });
      return;
    }
    route.continue();
  });

  await gotoCoverLetterWithAuth(page);

  // Then — 빈 폼 표시 (GET 실패를 조용히 처리)
  await expect(page.getByLabel(/1\./)).toHaveValue('');
  await expect(page.getByLabel(/2\./)).toHaveValue('');
  await expect(page.getByLabel(/3\./)).toHaveValue('');

  // Then — 에러 alert 미표시 (GET 실패는 조용히 처리)
  await expect(page.getByRole('alert')).toBeHidden();

  // When — 다음 버튼 클릭 (POST 경로)
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 정상적으로 다음 단계로 이동 (POST fallback 동작)
  await expect(page).toHaveURL('/onboarding/portfolio');
});

// ---------------------------------------------------------------------------
// AC8: "나중에 작성" 스킵 — API 미호출
// ---------------------------------------------------------------------------

test('AC8: 나중에 작성 클릭 시 API 호출 없이 다음 온보딩 단계로 이동한다', async ({ page }) => {
  // Given — GET은 정상, 저장 API 호출 여부를 감시
  let saveApiCalled = false;

  await page.route('**/api/essay-answers', (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ESSAY_EMPTY),
      });
      return;
    }
    // POST/PUT이 호출되면 감지
    saveApiCalled = true;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SAVE_SUCCESS),
    });
  });

  await gotoCoverLetterWithAuth(page);

  // When — 나중에 작성 버튼 클릭
  await page.getByRole('button', { name: '나중에 작성' }).click();

  // Then — 다음 단계로 이동
  await expect(page).toHaveURL('/onboarding/portfolio');

  // Then — 저장 API 미호출
  expect(saveApiCalled).toBe(false);
});
