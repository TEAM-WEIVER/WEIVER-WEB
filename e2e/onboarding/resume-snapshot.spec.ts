import { type Page } from '@playwright/test';

import { test, expect } from '../fixtures/auth';
import { fulfillJson } from '../fixtures/msw-helpers';

/**
 * 이력서 Snapshot PUT/POST 인수 테스트 (#100)
 *
 * AC1-a: 기존 데이터 있을 때 PUT 배열 전송 (Snapshot PUT)
 * AC1-b: 초기 저장 시 POST 배열 전송 (id 없음) — 신규 항목 입력 후 POST + 배열 payload 검증
 * AC2:   저장 실패 시 서버 데이터 재조회 후 폼 복구 + 에러 메시지
 */

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const API = {
  APPLICANTS_GET: '**/api/applicants',
  EDUCATION: '**/api/applicants/education',
  EXPERIENCE: '**/api/applicants/experience',
  CERTIFICATE: '**/api/applicants/certificate',
  AWARD: '**/api/applicants/award',
  APPLICANT_INFO: '**/api/applicants/info',
} as const;

// GET /api/applicants — 기존 데이터 있음 (서버 발급 id 존재)
// 필드명은 실제 ApplicantsAllData 타입과 일치해야 함 (degree: string, schoolName: string 등)
const APPLICANTS_WITH_DATA = {
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
    EducationDTO: [
      {
        educationId: 10,
        schoolName: '서울대학교',
        degree: 'BACHELOR',
        major: '컴퓨터공학',
        gpa: 3.5,
        startDate: '2010-03-01',
        endDate: '2014-02-28',
        status: 'GRADUATED',
      },
    ],
    WorkExperienceDTO: [
      {
        workExperienceId: 20,
        companyName: '(주)예시기업',
        position: '백엔드 개발자',
        startDate: '2014-03-01',
        endDate: '2018-02-28',
        duties: '서버 개발',
        employmentType: 'FULL_TIME',
        isRecognized: true,
      },
    ],
    CertificateDTO: [
      {
        certificateId: 30,
        certificateName: '정보처리기사',
        acquisitionDate: '2013-11-01',
        issuer: '한국산업인력공단',
      },
    ],
    AwardDTO: [
      {
        awardId: 40,
        awardName: '우수상',
        awardDate: '2012-05-01',
        issuer: '서울대학교',
      },
    ],
  },
  message: 'OK',
};

// GET /api/applicants — 초기 상태 (데이터 없음)
const APPLICANTS_EMPTY = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: null,
    EducationDTO: [],
    WorkExperienceDTO: [],
    CertificateDTO: [],
    AwardDTO: [],
  },
  message: 'OK',
};

const SAVE_SUCCESS = {
  status: 'OK',
  code: 200,
  data: null,
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

/** GET /api/applicants 목 등록 */
async function mockApplicantsGet(page: Page, body: object) {
  await page.route(API.APPLICANTS_GET, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 200, body);
  });
}

/** 이력서 서브 API(education/experience/certificate/award) 전체 성공 목 등록 */
async function mockSnapshotSuccess(page: Page) {
  const urls = [API.EDUCATION, API.EXPERIENCE, API.CERTIFICATE, API.AWARD, API.APPLICANT_INFO];
  for (const url of urls) {
    await page.route(url, async (route) => {
      if (route.request().method() === 'GET') {
        await route.continue();
        return;
      }
      await fulfillJson(route, 200, SAVE_SUCCESS);
    });
  }
}

async function gotoResume(page: Page) {
  const loadResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/applicants') && response.request().method() === 'GET',
  );
  await page.goto('/onboarding/resume');
  await loadResponse;
}

/**
 * 개인정보 필수 필드를 채운다.
 *
 * - 이름/이메일/전화번호/주소: id가 연결된 Label이 있으므로 getByLabel 사용
 * - 생년월일: DatePicker(date 모드) — 트리거 클릭 후 열린 CalendarPanel에서
 *   연도 select → 월 select → 일 버튼 클릭
 */
async function fillRequiredPersonalInfo(page: Page) {
  await page.getByLabel('이름').fill('홍길동');
  await page.getByLabel('이메일').fill('hong@example.com');
  await page.getByLabel('전화번호').fill('010-1234-5678');
  await page.getByLabel('주소').fill('서울특별시 강남구');

  // DatePicker 생년월일 입력 (mode="date" → CalendarPanel)
  // 트리거 버튼 클릭 → 팝업 오픈
  await page.getByRole('button', { name: '생년월일 선택' }).click();
  // 열린 팝업 내에서 visible한 select/버튼 조작 (다른 DatePicker가 닫혀 있으므로 유일)
  await page.locator('select[aria-label="연도 선택"]:visible').selectOption('1990');
  await page.locator('select[aria-label="월 선택"]:visible').selectOption('1');
  await page.getByRole('button', { name: '1', exact: true }).first().click();
}

/**
 * 학력 섹션의 첫 번째(빈) 카드에 신규 학력 정보를 입력한다.
 *
 * APPLICANTS_EMPTY 상태에서 폼에는 빈 학력 카드 1개가 기본으로 있다.
 * 이 카드에 직접 입력하여 hasSavedEducationsRef=false + validEducations 1건 조건을 만들어
 * POST /api/applicants/education 호출을 트리거한다.
 *
 * EducationSection의 Label은 htmlFor 미연결이므로 placeholder / aria-label로 식별한다.
 * gpa는 z.string().regex(0~4.5)로 검증되어 빈 문자열 불허 — 값을 채워야 한다.
 */
async function fillEducationCard(page: Page) {
  // 학력구분 select — aria-label 없음, '학력구분' 옵션을 포함하는 combobox
  await page.locator('select').filter({ hasText: '학력구분' }).first().selectOption('대학교(4년)');
  // 학교명 — placeholder로 Input 식별
  await page.getByPlaceholder('학교명을 입력해주세요.').first().fill('한양대학교');
  // 전공명
  await page.getByPlaceholder('전공명을 입력해주세요.').first().fill('소프트웨어공학');
  // 학점 (gpa) — 빈 문자열 불허이므로 값 입력
  await page.getByPlaceholder('예: 3.8 (4.5 만점)').first().fill('3.8');
  // 졸업상태 — aria-label="졸업상태"
  await page.locator('select[aria-label="졸업상태"]').first().selectOption('졸업');

  // 입학년월 입력 (mode="month" → MonthPickerPanel: 연도 select + 월 버튼)
  await page.getByRole('button', { name: '입학년월 선택' }).first().click();
  // MonthPickerPanel: visible한 연도 select만 존재 (CalendarPanel의 월 select와 다름)
  await page.locator('select[aria-label="연도 선택"]:visible').selectOption('2015');
  await page.getByRole('button', { name: '3월', exact: true }).click();

  // 졸업년월 입력
  await page.getByRole('button', { name: '졸업년월 선택' }).first().click();
  await page.locator('select[aria-label="연도 선택"]:visible').selectOption('2019');
  await page.getByRole('button', { name: '2월', exact: true }).click();
}

// ---------------------------------------------------------------------------
// AC1-a: 기존 데이터 있을 때 PUT으로 Snapshot 전송
// ---------------------------------------------------------------------------

test('AC1-a: 기존 데이터 있을 때 "다음" 클릭 시 PUT으로 배열을 전송하고 다음 단계로 이동한다', async ({
  page,
}) => {
  // Given — 서버에 이력서 데이터가 존재(id 있음)
  await mockApplicantsGet(page, APPLICANTS_WITH_DATA);

  const calledMethods: Record<string, string[]> = {
    education: [],
    experience: [],
    certificate: [],
    award: [],
    info: [],
  };

  // mockSnapshotSuccess로 공통 성공 목 등록 후 검증 필요한 엔드포인트만 덮어씀
  // (Playwright route는 나중에 등록된 핸들러가 우선 적용됨)
  await mockSnapshotSuccess(page);

  await page.route(API.EDUCATION, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.education.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.EXPERIENCE, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.experience.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.CERTIFICATE, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.certificate.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.AWARD, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.award.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.APPLICANT_INFO, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.info.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);

  // When — 필수 정보 입력 후 다음 버튼 클릭
  await fillRequiredPersonalInfo(page);
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 다음 단계로 이동
  await expect(page).toHaveURL('/onboarding/cover-letter');

  // Then — 서브 API가 PUT으로 호출됨 (기존 데이터 snapshot)
  expect(calledMethods.education).toContain('PUT');
  expect(calledMethods.education).not.toContain('POST');
  expect(calledMethods.experience).toContain('PUT');
  expect(calledMethods.certificate).toContain('PUT');
  expect(calledMethods.award).toContain('PUT');
});

// ---------------------------------------------------------------------------
// AC1-b: 초기 저장 시 POST로 배열 전송 (id 없음)
// Critical: 신규 항목 1건 입력 후 POST /api/applicants/education 실제 호출 + 배열 payload 검증
// ---------------------------------------------------------------------------

test('AC1-b: 신규 학력 1건 입력 후 POST /api/applicants/education에 배열 payload가 전송된다', async ({
  page,
}) => {
  // Given — 서버에 이력서 데이터 없음 (id 없음)
  await mockApplicantsGet(page, APPLICANTS_EMPTY);

  let educationPostBody: unknown = null;
  const calledMethods: Record<string, string[]> = {
    education: [],
    info: [],
  };

  // 공통 성공 목 등록 후 education만 덮어씀
  await mockSnapshotSuccess(page);

  await page.route(API.EDUCATION, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.education.push(route.request().method());
    if (route.request().method() === 'POST') {
      educationPostBody = route.request().postDataJSON();
    }
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.APPLICANT_INFO, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.info.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);

  // When — 필수 개인정보 입력
  await fillRequiredPersonalInfo(page);

  // When — 신규 학력 항목 입력 (초기 저장이므로 id 없음)
  // APPLICANTS_EMPTY 상태에서 폼에 빈 학력 카드 1개가 기본으로 존재한다.
  // 이 카드에 직접 입력하면 hasSavedEducationsRef=false + validEducations=1건
  // 조건이 충족되어 POST /api/applicants/education이 호출된다.
  await fillEducationCard(page);

  // When — 다음 버튼 클릭
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 다음 단계로 이동
  await expect(page).toHaveURL('/onboarding/cover-letter');

  // Then — POST /api/applicants/education 호출됨 (PUT이 아닌 POST)
  expect(calledMethods.education).toContain('POST');
  expect(calledMethods.education).not.toContain('PUT');

  // Then — payload가 배열 형태이며 id 필드를 포함하지 않음
  expect(educationPostBody).not.toBeNull();
  const body = educationPostBody as Record<string, unknown>;
  // AC1-b 스펙상 키는 EducationDTO로 고정 — fallback 없이 직접 단언
  expect(body).toHaveProperty('EducationDTO');
  const educationArray = body['EducationDTO'] as unknown[];
  expect(Array.isArray(educationArray)).toBe(true);
  expect(educationArray.length).toBeGreaterThanOrEqual(1);

  // Then — 각 항목에 educationId(서버 발급 id)가 없음
  const firstItem = educationArray[0] as Record<string, unknown>;
  expect(firstItem).not.toHaveProperty('educationId');
});

test('AC1-b: 초기 저장 시 항목이 없으면 education POST는 호출되지 않는다', async ({ page }) => {
  // Given — 서버에 이력서 데이터 없음, 사용자도 학력 추가 안 함
  await mockApplicantsGet(page, APPLICANTS_EMPTY);

  const calledMethods: Record<string, string[]> = {
    education: [],
    info: [],
  };

  // 공통 성공 목 등록 후 education/info만 덮어씀
  await mockSnapshotSuccess(page);

  await page.route(API.EDUCATION, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.education.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });
  await page.route(API.APPLICANT_INFO, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    calledMethods.info.push(route.request().method());
    await fulfillJson(route, 200, SAVE_SUCCESS);
  });

  await gotoResume(page);

  // When — 필수 정보만 입력하고 다음 버튼 클릭 (학력 추가 없음)
  await fillRequiredPersonalInfo(page);
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 다음 단계로 이동
  await expect(page).toHaveURL('/onboarding/cover-letter');

  // Then — 빈 배열은 Zod 검증으로 차단되므로 education은 호출 안됨
  expect(calledMethods.education).not.toContain('PUT');
  expect(calledMethods.education).not.toContain('POST');
});

// ---------------------------------------------------------------------------
// AC2: 저장 실패 시 서버 재조회 후 폼 복구
// ---------------------------------------------------------------------------

test('AC2: education PUT 실패 시 GET으로 서버 데이터 재조회 후 에러 메시지를 표시한다', async ({
  page,
}) => {
  // Given — 서버에 데이터 있음, education PUT이 실패
  let getCallCount = 0;

  await page.route(API.APPLICANTS_GET, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    getCallCount++;
    await fulfillJson(route, 200, APPLICANTS_WITH_DATA);
  });

  // mockSnapshotSuccess로 기본 성공 목 등록 후 education만 실패로 덮어씀
  await mockSnapshotSuccess(page);

  await page.route(API.EDUCATION, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 500, SERVER_ERROR);
  });

  await gotoResume(page);
  await fillRequiredPersonalInfo(page);
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('오류가 발생했습니다. 다시 시도해주세요.', { exact: true }),
  ).toBeVisible();

  // Then — 페이지 유지
  await expect(page).toHaveURL('/onboarding/resume');

  // Then — GET /api/applicants 재조회 (초기 로드 1회 + 실패 후 재조회 1회 = 2회)
  expect(getCallCount).toBeGreaterThanOrEqual(2);
});

test('AC2: GET 재조회도 실패 시 "페이지 새로고침" 안내 메시지를 표시한다', async ({ page }) => {
  // Given — education PUT 실패, GET 재조회도 실패
  let failReload = false;

  await page.route(API.APPLICANTS_GET, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(
      route,
      failReload ? 500 : 200,
      failReload ? SERVER_ERROR : APPLICANTS_WITH_DATA,
    );
  });

  // mockSnapshotSuccess로 기본 성공 목 등록 후 education만 실패로 덮어씀
  await mockSnapshotSuccess(page);

  await page.route(API.EDUCATION, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    await fulfillJson(route, 500, SERVER_ERROR);
  });

  await gotoResume(page);
  // 개발 모드 StrictMode의 추가 GET까지 모두 초기 로드 성공으로 처리한다.
  await page.waitForLoadState('networkidle');
  await fillRequiredPersonalInfo(page);
  // 저장 실패 이후에 발생하는 재조회만 실패시킨다.
  failReload = true;
  await page.getByRole('button', { name: '다음' }).click();

  // Then — 재조회 실패 시 더 강한 안내 메시지 표시
  await expect(
    page.getByText('오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.', {
      exact: true,
    }),
  ).toBeVisible();

  await expect(page).toHaveURL('/onboarding/resume');
});
