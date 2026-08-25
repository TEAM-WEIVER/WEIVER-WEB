import { type Page, type Route } from '@playwright/test';

import { test, expect } from '../fixtures/auth';

const APPLICANTS_API = '**/api/applicants';
const APPLICANT_INFO_API = '**/api/applicants/info';

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

const SAVE_SUCCESS = {
  status: 'OK',
  code: 200,
  data: null,
  message: 'OK',
};

async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockResumeLoad(page: Page) {
  await page.route(APPLICANTS_API, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await fulfillJson(route, 200, EMPTY_RESUME);
  });
}

async function gotoResume(page: Page) {
  const loadResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/applicants') && response.request().method() === 'GET',
  );
  await page.goto('/onboarding/resume');
  await loadResponse;
}

async function fillBirthday(page: Page) {
  // DatePicker 트리거 버튼 클릭 → 캘린더 팝업 열기
  const birthdayTrigger = page.getByRole('button', { name: '생년월일 선택' });
  await birthdayTrigger.click();

  // 생년월일 DatePicker 컨테이너 내부로 범위 한정
  const birthdayPicker = page.locator('div').filter({
    has: birthdayTrigger,
  });

  // 연도/월 select는 팝업이 열린 후 컨테이너 안에서만 찾기
  await birthdayPicker.locator('select[aria-label="연도 선택"]').selectOption('2000');
  await birthdayPicker.locator('select[aria-label="월 선택"]').selectOption('1');
  // 날짜 버튼 클릭 (1일) — 팝업 내부에서 '1' 버튼
  await birthdayPicker.getByRole('button', { name: '1', exact: true }).click();
}

async function fillRequiredFields(page: Page) {
  await page.getByLabel('이름').fill('홍길동');
  await fillBirthday(page);
  await page.getByLabel('이메일').fill('hong@example.com');
  await page.getByLabel('전화번호').fill('010-1234-5678');
  await page.getByLabel('주소').fill('서울특별시 강남구');
}

test.beforeEach(async ({ page }) => {
  await mockResumeLoad(page);
});

test('필수 항목 저장 성공 시 자기소개서 단계로 이동한다', async ({ page }) => {
  let saveCalled = false;

  await page.route(APPLICANT_INFO_API, async (route) => {
    saveCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);
  await fillRequiredFields(page);
  await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();

  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL('/onboarding/cover-letter');
  expect(saveCalled).toBe(true);
});

test('필수 항목이 비어 있으면 다음 버튼 클릭 시 저장 API를 호출하지 않는다', async ({ page }) => {
  let saveCalled = false;

  await page.route(APPLICANT_INFO_API, async (route) => {
    saveCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);

  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL('/onboarding/resume');
  expect(saveCalled).toBe(false);
});

test('일부 필수 항목만 입력하고 제출하면 현재 페이지를 유지한다', async ({ page }) => {
  let saveCalled = false;

  await page.route(APPLICANT_INFO_API, async (route) => {
    saveCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);

  await page.getByLabel('이름').fill('홍길동');
  await page.getByRole('button', { name: '다음' }).click();

  await expect(page).toHaveURL('/onboarding/resume');
  expect(saveCalled).toBe(false);
});

test('저장 API 실패 시 오류를 표시하고 현재 페이지를 유지한다', async ({ page }) => {
  await page.route(APPLICANT_INFO_API, (route) =>
    fulfillJson(route, 500, {
      status: 'INTERNAL_SERVER_ERROR',
      code: 500,
      data: null,
      message: '서버 오류',
    }),
  );

  await gotoResume(page);
  await fillRequiredFields(page);
  await page.getByRole('button', { name: '다음' }).click();

  await expect(
    page.getByText('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL('/onboarding/resume');
  await expect(page.getByRole('button', { name: '다음' })).toBeEnabled();
});

test('저장 중에는 다음 버튼이 비활성화되어 중복 제출을 방지한다', async ({ page }) => {
  let releaseSave: (() => void) | undefined;

  await page.route(APPLICANT_INFO_API, async (route) => {
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);
  await fillRequiredFields(page);

  const nextButton = page.locator('button[type="submit"]');
  await nextButton.click();
  await expect(nextButton).toBeDisabled();
  await expect(nextButton).toHaveAttribute('aria-busy', 'true');

  await expect.poll(() => releaseSave).toBeDefined();
  releaseSave!();
  await expect(page).toHaveURL('/onboarding/cover-letter');
});

test('나중에 작성을 선택하면 저장 API 없이 자기소개서 단계로 이동한다', async ({ page }) => {
  let saveCalled = false;

  await page.route(APPLICANT_INFO_API, async (route) => {
    saveCalled = true;
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);
  await page.getByRole('button', { name: '나중에 작성' }).click();

  await expect(page).toHaveURL('/onboarding/cover-letter');
  expect(saveCalled).toBe(false);
});
