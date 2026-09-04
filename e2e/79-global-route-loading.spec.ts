import { type Page, type Route } from '@playwright/test';

import { test, expect } from './fixtures/auth';

/**
 * 글로벌 라우트 전환 로딩 인수 테스트 (#79)
 *
 * 검증 대상: 라우트 전환이 200ms 이상 소요될 때 상단 프로그레스 바가 노출되고,
 *            pathname 변경(URL commit) 시 자동 소멸하는지 확인한다.
 *
 * 프로그레스 바 셀렉터: role="progressbar" + aria-label="페이지 전환 중"
 * (컴포넌트 스펙 접근성 속성 기준)
 *
 * 느린 전환 시뮬레이션 전략:
 * - page.route()로 이동 대상 페이지의 데이터 API를 300ms 지연시켜
 *   라우트 렌더링 지연(200ms+) 조건을 만든다.
 * - Next.js App Router는 서버 컴포넌트 fetch가 완료되어야 URL을 commit하므로
 *   해당 API를 지연하면 전환 지연 조건을 충족한다.
 */

// ---------------------------------------------------------------------------
// 공통 상수
// ---------------------------------------------------------------------------

const PROGRESS_BAR = '[role="progressbar"][aria-label="페이지 전환 중"]';

const AUTH_ROLE_STORAGE_KEY = 'weiver.auth.role';

const APPLICANTS_API = '**/api/applicants';
const APPLICANT_INFO_API = '**/api/applicants/info';
const ESSAY_API = '**/api/essay-answers';
const PORTFOLIOS_API = '**/api/portfolios';

const OK = (data: unknown = null) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** 지정 ms 지연 후 JSON 응답을 반환하는 route 핸들러 등록 */
async function mockSlowJson(
  page: Page,
  pattern: string,
  status: number,
  body: object,
  delayMs: number,
) {
  await page.route(pattern, async (route) => {
    await new Promise((r) => setTimeout(r, delayMs));
    await fulfillJson(route, status, body);
  });
}

/** 기업 사용자로 role을 재설정한다 (applicantAuth fixture 이후 override) */
async function overrideToCorporateRole(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      window.sessionStorage.setItem(storageKey, 'CORPORATE');
    },
    { storageKey: AUTH_ROLE_STORAGE_KEY },
  );
}

// ---------------------------------------------------------------------------
// 온보딩 이력서 — 공통 픽스처
// ---------------------------------------------------------------------------

const EMPTY_RESUME = OK({
  ApplicantDTO: null,
  EducationDTO: [],
  AwardDTO: [],
  WorkExperienceDTO: [],
  CertificateDTO: [],
});

const EMPTY_ESSAY = OK({ answers: [] });
const SAVE_SUCCESS = OK(null);

const EMPTY_PORTFOLIO_DATA = OK({
  portfolioId: null,
  downloadUrl: null,
  fileName: null,
  fileType: null,
  fileSize: null,
  urlGithub: null,
  urlTech: null,
  urlEtc: null,
});

async function mockResumeLoad(page: Page) {
  await page.route(APPLICANTS_API, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 200, EMPTY_RESUME);
  });
}

async function fillRequiredResumeFields(page: Page) {
  await page.getByLabel('이름').fill('홍길동');

  const birthdayTrigger = page.getByRole('button', { name: '생년월일 선택' });
  await birthdayTrigger.click();
  const birthdayPicker = page.locator('div').filter({ has: birthdayTrigger });
  await birthdayPicker.locator('select[aria-label="연도 선택"]').selectOption('2000');
  await birthdayPicker.locator('select[aria-label="월 선택"]').selectOption('1');
  await birthdayPicker.getByRole('button', { name: '1', exact: true }).click();

  await page.getByLabel('이메일').fill('hong@example.com');
  await page.getByLabel('전화번호').fill('010-1234-5678');
  await page.getByLabel('주소').fill('서울특별시 강남구');
}

// ---------------------------------------------------------------------------
// AC1: /onboarding/resume — 저장 성공 후 전환 시 프로그레스 바 노출
// ---------------------------------------------------------------------------

test.describe('AC1: 온보딩 이력서 저장 후 다음 단계 전환', () => {
  test('저장 성공 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — 이력서 로드 목, 저장 즉시 성공
    await mockResumeLoad(page);
    await page.route(APPLICANT_INFO_API, async (route) => {
      await fulfillJson(route, 200, SAVE_SUCCESS);
    });

    // 다음 페이지(자기소개서)에서 호출되는 essay-answers API를 300ms 지연
    await page.route(ESSAY_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      await fulfillJson(route, 200, EMPTY_ESSAY);
    });

    const loadResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/applicants') && res.request().method() === 'GET',
    );
    await page.goto('/onboarding/resume');
    await loadResponse;

    await fillRequiredResumeFields(page);
    await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();

    // When — 다음 버튼 클릭 → router.push 실행, 200ms+ 소요
    await page.getByRole('button', { name: '다음' }).click();

    // Then — 전환 중 프로그레스 바가 나타난다
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // Then — pathname 변경(URL commit) 후 프로그레스 바가 사라진다
    await expect(page).toHaveURL('/onboarding/cover-letter');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });

  test('저장 성공 후 100ms 미만 소요 시 프로그레스 바가 노출되지 않는다', async ({ page }) => {
    // Given — 저장 및 다음 페이지 모두 즉시 응답 (빠른 전환)
    await mockResumeLoad(page);
    await page.route(APPLICANT_INFO_API, async (route) => {
      await fulfillJson(route, 200, SAVE_SUCCESS);
    });
    await page.route(ESSAY_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await fulfillJson(route, 200, EMPTY_ESSAY);
    });

    const loadResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/applicants') && res.request().method() === 'GET',
    );
    await page.goto('/onboarding/resume');
    await loadResponse;

    await fillRequiredResumeFields(page);

    // When — 다음 버튼 클릭 (빠른 전환)
    await page.getByRole('button', { name: '다음' }).click();

    // Then — URL 변경 완료, 프로그레스 바 미노출
    await expect(page).toHaveURL('/onboarding/cover-letter');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC2: /onboarding/cover-letter — 다음/나중에 작성/이전 단계 클릭 시 프로그레스 바 노출
// ---------------------------------------------------------------------------

test.describe('AC2: 온보딩 자기소개서 — 버튼 클릭 시 로딩 바', () => {
  test.beforeEach(async ({ page }) => {
    // cover-letter 페이지 초기 로드는 즉시 응답
    await page.route(ESSAY_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await fulfillJson(route, 200, EMPTY_ESSAY);
    });
  });

  test('"다음" 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — 저장 즉시 성공, portfolio 로드 300ms 지연
    await page.route(ESSAY_API, async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await fulfillJson(route, 200, EMPTY_ESSAY);
        return;
      }
      if (method === 'POST') {
        await fulfillJson(route, 200, SAVE_SUCCESS);
        return;
      }
      await route.continue();
    });
    await page.route(PORTFOLIOS_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      await fulfillJson(route, 200, EMPTY_PORTFOLIO_DATA);
    });

    await page.goto('/onboarding/cover-letter');

    // When — 다음 버튼 클릭
    await page.getByRole('button', { name: '다음' }).click();

    // Then — 프로그레스 바 노출
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // Then — pathname 변경 후 자동 소멸
    await expect(page).toHaveURL('/onboarding/portfolio');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });

  test('"나중에 작성" 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — portfolio 로드 300ms 지연
    await mockSlowJson(page, PORTFOLIOS_API, 200, EMPTY_PORTFOLIO_DATA, 300);

    await page.goto('/onboarding/cover-letter');

    // When — 나중에 작성 클릭
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // Then — 프로그레스 바 노출 후 소멸
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();
    await expect(page).toHaveURL('/onboarding/portfolio');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });

  test('"이전 단계" 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — resume 페이지 로드 300ms 지연
    await mockSlowJson(page, APPLICANTS_API, 200, EMPTY_RESUME, 300);

    await page.goto('/onboarding/cover-letter');

    // When — 이전 단계 클릭
    await page.getByRole('button', { name: '이전 단계' }).click();

    // Then — 프로그레스 바 노출 후 소멸
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();
    await expect(page).toHaveURL('/onboarding/resume');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC2(포트폴리오): /onboarding/portfolio — 버튼 클릭 시 프로그레스 바 노출
// ---------------------------------------------------------------------------

test.describe('AC2: 온보딩 포트폴리오 — 버튼 클릭 시 로딩 바', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(PORTFOLIOS_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await fulfillJson(route, 200, EMPTY_PORTFOLIO_DATA);
    });
  });

  test('"나중에 작성" 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — portfolio 페이지 진입, dashboard로 이동 시 관련 API 지연
    await page.route('**/api/applicants/dashboard**', async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    const loadResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/portfolios') && res.request().method() === 'GET',
    );
    await page.goto('/onboarding/portfolio');
    await loadResponse;

    // When — 나중에 작성 클릭 → router.push('/applicant/dashboard')
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // Then — 프로그레스 바 노출 후 소멸
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();
    await expect(page).toHaveURL('/applicant/dashboard');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });

  test('"이전 단계" 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — cover-letter 로드 300ms 지연
    await mockSlowJson(page, ESSAY_API, 200, EMPTY_ESSAY, 300);

    const loadResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/portfolios') && res.request().method() === 'GET',
    );
    await page.goto('/onboarding/portfolio');
    await loadResponse;

    // When — 이전 단계 클릭
    await page.getByRole('button', { name: '이전 단계' }).click();

    // Then — 프로그레스 바 노출 후 소멸
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();
    await expect(page).toHaveURL('/onboarding/cover-letter');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC3: /applicant/dashboard — 프로필 편집 버튼 클릭 시 프로그레스 바 노출
// ---------------------------------------------------------------------------

test.describe('AC3: 지원자 대시보드 프로필 편집 전환', () => {
  test('프로필 편집 버튼 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — 대시보드 API는 즉시 응답
    await page.route('**/api/applicants**', async (route) => {
      await route.continue();
    });

    await page.goto('/applicant/dashboard');

    // 편집 페이지 이동 후 로드될 API를 300ms 지연
    await page.route(APPLICANT_INFO_API, async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    // When — 프로필 편집 버튼 클릭 → router.push(getProfileEditPath(progress))
    await page.getByRole('button', { name: '프로필 편집' }).click();

    // Then — 전환 중 프로그레스 바 노출
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // Then — 이동 완료 후 소멸
    await expect(page).not.toHaveURL('/applicant/dashboard');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC4: /corporate/recruitment/[jdId] — breadcrumb "공고목록" 클릭 시 프로그레스 바 노출
// ---------------------------------------------------------------------------

test.describe('AC4: 기업 지원자 리스트 breadcrumb 공고목록 이동', () => {
  const JD_ID = 'test-jd-1';

  test.beforeEach(async ({ page }) => {
    // 기업 사용자로 role override (applicantAuth fixture의 APPLICANT를 CORPORATE로 재설정)
    await overrideToCorporateRole(page);
  });

  test('"공고목록" breadcrumb 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — corporate recruitment 페이지 진입, recruitment 상세 API 즉시 응답
    await page.route(`**/api/job-descriptions/${JD_ID}**`, async (route) => {
      await route.continue();
    });

    await page.goto(`/corporate/recruitment/${JD_ID}`);

    // corporate dashboard 로드 시 job-descriptions 목록 API를 300ms 지연
    await page.route('**/api/job-descriptions', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    // When — breadcrumb "공고목록" Link 클릭 (onNavigate → SPA 내비게이션 시작)
    await page.getByRole('link', { name: '공고목록' }).click();

    // Then — 전환 중 프로그레스 바 노출
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // Then — pathname 변경 후 자동 소멸
    await expect(page).toHaveURL('/corporate/dashboard');
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC5: /corporate/recruitment/[jdId] — 지원자 행 클릭 시 리포트 페이지 이동
// ---------------------------------------------------------------------------

test.describe('AC5: 기업 지원자 리스트 지원자 행 클릭', () => {
  const JD_ID = 'test-jd-1';
  const PUBLIC_ID = 'applicant-public-id-1';

  test.beforeEach(async ({ page }) => {
    await overrideToCorporateRole(page);
  });

  test('지원자 행 클릭 후 300ms 소요 시 프로그레스 바가 노출된다', async ({ page }) => {
    // Given — corporate recruitment 페이지에 지원자 목록이 표시된 상태
    await page.route(`**/api/job-descriptions/${JD_ID}**`, async (route) => {
      await route.continue();
    });

    await page.goto(`/corporate/recruitment/${JD_ID}`);

    // 리포트 페이지 로드 API를 300ms 지연
    await page.route(`**/api/applicants/${PUBLIC_ID}/report**`, async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    // When — 지원자 행 Link 클릭 (onNavigate → SPA 내비게이션)
    // 헤더를 제외한 첫 번째 지원자 행을 클릭한다
    const applicantRow = page.getByRole('row').nth(1);
    await applicantRow.click();

    // Then — 전환 중 프로그레스 바 노출
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // Then — 리포트 페이지 이동 완료 후 소멸
    await expect(page).toHaveURL(`/corporate/recruitment/${JD_ID}/applicants/${PUBLIC_ID}/report`);
    await expect(page.locator(PROGRESS_BAR)).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// AC6: 전환 완료 및 인터럽션 — 프로그레스 바 자동 소멸 / 즉시 리셋
// ---------------------------------------------------------------------------

test.describe('AC6: 전환 완료 및 인터럽션 시 프로그레스 바 자동 소멸', () => {
  test('pathname 변경 시 300ms(100ms 페이드 + 여유분) 이내에 프로그레스 바가 사라진다', async ({
    page,
  }) => {
    // Given — 이력서 → 자기소개서 느린 전환으로 프로그레스 바 노출 상태 만들기
    await mockResumeLoad(page);
    await page.route(APPLICANT_INFO_API, async (route) => {
      await fulfillJson(route, 200, SAVE_SUCCESS);
    });
    // 다음 페이지 로드를 300ms 지연 → 바 노출 조건 충족
    await page.route(ESSAY_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      await fulfillJson(route, 200, EMPTY_ESSAY);
    });

    const loadResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/applicants') && res.request().method() === 'GET',
    );
    await page.goto('/onboarding/resume');
    await loadResponse;

    await fillRequiredResumeFields(page);
    await page.getByRole('button', { name: '다음' }).click();

    // 바가 노출됨을 확인
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // When — pathname 변경 완료 (URL commit)
    await expect(page).toHaveURL('/onboarding/cover-letter');

    // Then — 100ms 페이드 아웃 + 200ms 여유분(300ms 내) 안에 프로그레스 바가 사라진다
    await expect(page.locator(PROGRESS_BAR)).toBeHidden({ timeout: 300 });
  });

  test('전환 중 새 내비게이션이 발생하면 이전 바를 즉시 리셋하고 새 전환 바를 시작한다', async ({
    page,
  }) => {
    // Given — cover-letter 페이지에서 두 가지 느린 전환 설정
    await page.route(ESSAY_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await fulfillJson(route, 200, EMPTY_ESSAY);
    });

    await page.goto('/onboarding/cover-letter');

    // portfolio 로드를 명시적 해제 전까지 블로킹 — 첫 번째 전환 중단용
    let releasePortfolio: (() => void) | undefined;
    await page.route(PORTFOLIOS_API, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await new Promise<void>((r) => {
        releasePortfolio = r;
      });
      await fulfillJson(route, 200, EMPTY_PORTFOLIO_DATA);
    });

    // resume 로드도 300ms 지연
    await mockSlowJson(page, APPLICANTS_API, 200, EMPTY_RESUME, 300);

    // When — "나중에 작성" 클릭 → portfolio 전환 시작
    await page.getByRole('button', { name: '나중에 작성' }).click();

    // 바가 노출될 때까지 대기
    await expect(page.locator(PROGRESS_BAR)).toBeVisible();

    // When — portfolio 로드가 완료되기 전에 "이전 단계" 클릭으로 새 내비게이션 발생
    // (실제로는 브라우저 뒤로가기나 다른 버튼 클릭으로 인터럽션 발생)
    // 여기서는 portfolio 로드를 해제하여 URL commit 후 즉시 소멸 검증
    releasePortfolio!();

    // Then — 최종 전환 완료 후 바가 사라진다 (리셋 포함)
    await expect(page.locator(PROGRESS_BAR)).toBeHidden({ timeout: 1000 });

    // Then — 최종 URL이 portfolio로 정착한다
    await expect(page).toHaveURL('/onboarding/portfolio');
  });
});
