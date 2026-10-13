import { test, expect, type Page } from '@playwright/test';

import { mockApplicantAuth, mockCorporateAuth } from './fixtures/auth';
import { fulfillJson } from './fixtures/msw-helpers';
import { mockRootRoutingApis } from './mocks/root-routing';

const LOGIN_HEADING = '로그인하고 AI 채용 서비스를 만나보세요.';
const protectedRoutes = [
  { path: '/corporate/dashboard', role: 'COMPANY', heading: '프론트엔드 개발자' },
  { path: '/applicant/dashboard', role: 'APPLICANT', heading: '홍길동님' },
  { path: '/onboarding/resume', role: 'APPLICANT', heading: '이력서를 작성해주세요.' },
] as const;

async function mockRole(page: Page, role: 'APPLICANT' | 'COMPANY') {
  await (role === 'APPLICANT' ? mockApplicantAuth(page) : mockCorporateAuth(page));
}

test.describe('#128 루트 로그인 자동 이동 제거', () => {
  let unexpectedRequests: string[];

  test.beforeEach(async ({ page }) => {
    unexpectedRequests = await mockRootRoutingApis(page);
  });

  test.afterEach(() => {
    expect(unexpectedRequests, 'API 목이 없는 요청이 발생하지 않아야 한다').toEqual([]);
  });

  // #136 replaces the former empty-root acceptance criteria with Oracle landing tests.

  test('AC3: 로그인 직접 접속·새로고침과 개인·기업 탭의 기존 폼이 유지된다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: LOGIN_HEADING })).toBeVisible();
    await expect(page.getByLabel('아이디', { exact: true })).toBeVisible();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인하기', exact: true })).toBeDisabled();

    await page.getByRole('button', { name: '개인 회원', exact: true }).click();
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await expect(page.getByLabel('아이디', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '기업 회원', exact: true }).click();
    await expect(page.getByLabel('아이디', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/login');

    await page.reload();
    await expect(page.getByRole('heading', { name: LOGIN_HEADING })).toBeVisible();
    await expect(page.getByLabel('아이디', { exact: true })).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  for (const { path, role, heading } of protectedRoutes) {
    test(`AC4: 저장된 ${role} 역할과 재발급 성공 시 ${path} 콘텐츠가 표시된다`, async ({
      page,
    }) => {
      await mockRole(page, role);
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page).toHaveURL(path);
      await page.reload();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      if (path === '/onboarding/resume') {
        await expect(page.getByLabel('이름', { exact: true })).toHaveValue('홍길동');
      }
    });

    for (const status of [401, 500]) {
      test(`AC5: ${path} 재발급 ${status} 확인 중·실패 후 콘텐츠 비노출 및 로그인 이동`, async ({
        page,
      }) => {
        let release!: () => void;
        let requested = false;
        const pendingResponse = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/api/auth/reissue', async (route) => {
          requested = true;
          await pendingResponse;
          await fulfillJson(route, status, {
            status: status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR',
            code: status,
            data: null,
            message: '재발급 실패',
          });
        });

        await page.goto(path);
        await expect.poll(() => requested).toBe(true);
        // Holding the actual auth response makes the checking state observable.
        await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0);
        await expect(
          page.getByLabel(/기업 요약 로딩 중|채용공고 로딩 중|프로필 로딩 중/),
        ).toHaveCount(0);
        await expect(page.getByLabel('이름', { exact: true })).toHaveCount(0);
        release();
        await expect(page).toHaveURL('/login');
        await expect(page.getByRole('heading', { name: LOGIN_HEADING })).toBeVisible();
        await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0);
      });
    }

    test(`AC6: ${path} 역할 불일치 시 금지 콘텐츠 없이 자기 역할 대시보드로 이동`, async ({
      page,
    }) => {
      const wrongRole = role === 'COMPANY' ? 'APPLICANT' : 'COMPANY';
      const destination = protectedRoutes.find((route) => route.role === wrongRole)!;
      await mockRole(page, wrongRole);
      await page.goto(path);
      await expect(page).toHaveURL(destination.path);
      await expect(
        page.getByRole('heading', { name: destination.heading, exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0);
    });
  }
});
