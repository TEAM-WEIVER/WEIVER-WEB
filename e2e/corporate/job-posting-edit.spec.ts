import { test, expect, type Page } from '@playwright/test';

import { mockCorporateAuth } from '../fixtures/auth';

const JD_ID = 101;
const EDIT_URL = `/corporate/recruitment/${JD_ID}/edit`;
const APPLICANTS_URL = `/corporate/recruitment/${JD_ID}`;

const apiResponse = <TData>(data: TData) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

const jobPosting = {
  jdId: JD_ID,
  title: '프론트엔드 개발자',
  deadline: '2026-12-31',
  jobCategory: '개발자',
  detailedJob: '프론트엔드 개발자',
  jobDescription: '웹 서비스를 개발합니다.',
  qualifications: 'React 경험',
  requirements: 'TypeScript 경험',
  preferredQualifications: 'Next.js 경험',
  competencyPriorities: ['문제해결력', '커뮤니케이션'],
  requiredTechs: ['React', 'TypeScript'],
  traitPriorities: ['안정 · 질서', '자율 · 혁신'],
  emailTitle: '[WEIVER] 지원 결과 안내',
  emailContent: '지원해 주셔서 감사합니다.',
};

async function mockApplicantList(page: Page) {
  await page.route(`**/api/job-postings/${JD_ID}/applicants**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        apiResponse({ content: [], totalPages: 0, totalElements: 0, pageable: {} }),
      ),
    }),
  );
}

test.describe('기업 채용공고 수정 (#103)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await mockCorporateAuth(page);
    await mockApplicantList(page);
  });

  test('조회된 공고를 폼에 표시하고 전체 updateDTO로 수정한다', async ({ page }) => {
    let updateRequestBody = '';

    await page.route(`**/api/job-postings/${JD_ID}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiResponse(jobPosting)),
        });
        return;
      }

      if (route.request().method() === 'PUT') {
        updateRequestBody = route.request().postData() ?? '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(apiResponse(null)),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto(EDIT_URL);

    await expect(page.getByRole('heading', { name: '공고를 수정해주세요.' })).toBeVisible();
    await expect(page.getByLabel('공고 제목')).toHaveValue(jobPosting.title);
    await expect(page.getByLabel('메일 제목')).toHaveValue(jobPosting.emailTitle);

    await page.getByLabel('공고 제목').fill('수정된 프론트엔드 개발자');
    await page.getByRole('button', { name: '수정 저장' }).click();

    await expect(page).toHaveURL(new RegExp(`${APPLICANTS_URL}\\?refresh=`));
    expect(updateRequestBody).toContain('name="updateDTO"');
    expect(updateRequestBody).toContain('수정된 프론트엔드 개발자');
    expect(updateRequestBody).toContain('"isEmailBannerDeleted":false');
    expect(updateRequestBody).toContain('"requiredTechs":["React","TypeScript"]');
    expect(updateRequestBody).toContain('"traitPriorities":["안정·질서","자율·혁신"');
  });

  test('삭제를 취소하면 요청을 보내지 않고 수정 화면을 유지한다', async ({ page }) => {
    let deleteRequestCount = 0;

    await page.route(`**/api/job-postings/${JD_ID}`, async (route) => {
      if (route.request().method() === 'DELETE') deleteRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(jobPosting)),
      });
    });

    await page.goto(EDIT_URL);
    await page.getByRole('button', { name: '공고 삭제' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();

    expect(deleteRequestCount).toBe(0);
    await expect(page).toHaveURL(EDIT_URL);
  });

  test('삭제를 확정하면 대시보드로 이동한다', async ({ page }) => {
    await page.route(`**/api/job-postings/${JD_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          apiResponse(route.request().method() === 'DELETE' ? null : jobPosting),
        ),
      });
    });

    await page.route('**/api/dashboards/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse({ content: [], totalPages: 0 })),
      }),
    );

    await page.goto(EDIT_URL);
    await page.getByRole('button', { name: '공고 삭제' }).click();
    await page.getByRole('button', { name: '삭제', exact: true }).click();

    await expect(page).toHaveURL('/corporate/dashboard');
  });

  test('공고 조회 실패를 안내한다', async ({ page }) => {
    await page.route(`**/api/job-postings/${JD_ID}`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ERROR', code: 500, data: null, message: '서버 오류' }),
      }),
    );

    await page.goto(EDIT_URL);

    await expect(
      page.getByText('공고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    ).toBeVisible();
  });

  test('삭제 API 실패를 열린 확인 대화상자에서 안내한다', async ({ page }) => {
    await page.route(`**/api/job-postings/${JD_ID}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ERROR', code: 500, data: null, message: '서버 오류' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(apiResponse(jobPosting)),
      });
    });

    await page.goto(EDIT_URL);
    await page.getByRole('button', { name: '공고 삭제' }).click();
    await page.getByRole('button', { name: '삭제', exact: true }).click();

    await expect(page.getByRole('dialog')).toContainText('공고 삭제에 실패했습니다.');
  });
});
