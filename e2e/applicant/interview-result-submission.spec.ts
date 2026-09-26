import { type Page } from '@playwright/test';

import { expect, test } from '../fixtures/auth';
import { fulfillJson } from '../fixtures/msw-helpers';

const API = {
  APPLICANTS: '**/api/applicants',
  SUBMISSION_STATUS: '**/api/applicants/submission-status',
  REMAINING: '**/api/interviews/remaining',
  ANALYSIS: '**/api/interviews/session-1/analysis',
} as const;

const SESSION_ID = 'session-1';

const applicantsResponse = {
  status: 'OK',
  code: 200,
  data: {
    ApplicantDTO: {
      name: '홍길동',
      email: 'hong@example.com',
      birthday: '1990-01-01',
      phoneNumber: '010-1234-5678',
      photoUrl: null,
    },
  },
  message: 'OK',
};

const submissionStatusResponse = {
  status: 'OK',
  code: 200,
  data: {
    resumeCompleted: true,
    essayCompleted: true,
    portfolioCompleted: true,
    submitted: true,
    syncStatus: 'COMPLETED',
    submittable: false,
  },
  message: 'OK',
};

function remainingResponse({
  totalCount,
  remainingCount,
  pendingSubmissionSessionId,
  reapplyDDay = 0,
}: {
  totalCount: number;
  remainingCount: number;
  pendingSubmissionSessionId: string | null;
  reapplyDDay?: number;
}) {
  return {
    status: 'OK',
    code: 200,
    data: {
      totalCount,
      remainingCount,
      reapplyDDay,
      reapplyAvailableDate: '2026-10-13',
      pendingSubmissionSessionId,
    },
    message: 'OK',
  };
}

async function mockDashboardBase(page: Page) {
  await page.route(API.SUBMISSION_STATUS, (route) =>
    fulfillJson(route, 200, submissionStatusResponse),
  );
  await page.route(API.APPLICANTS, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return fulfillJson(route, 200, applicantsResponse);
  });
}

test.describe('#114 다회 AI 면접 결과 선택 제출', () => {
  test('후보 면접이 있으면 동적 횟수를 표시하고 결과 제출 확인 모달을 연다', async ({ page }) => {
    await mockDashboardBase(page);
    await page.route(API.REMAINING, (route) =>
      fulfillJson(
        route,
        200,
        remainingResponse({
          totalCount: 4,
          remainingCount: 3,
          pendingSubmissionSessionId: SESSION_ID,
        }),
      ),
    );

    await page.goto('/applicant/dashboard');

    await expect(page.getByRole('link', { name: 'AI 면접 진행하기 (1/4)' })).toBeVisible();
    await page.getByRole('button', { name: '면접 결과 제출하기' }).click();

    const dialog = page.getByRole('dialog', { name: '면접 결과를 제출하시겠습니까?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('제출한 뒤에는 다시 면접을 볼 수 없습니다.')).toBeVisible();
    await dialog.getByRole('button', { name: '계속 면접 보기' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('결과 제출 성공 후 면접과 결과 제출을 잠그고 재지원 D-day를 표시한다', async ({ page }) => {
    await mockDashboardBase(page);
    let analysisRequestCount = 0;
    let analysisCompleted = false;

    await page.route(API.REMAINING, (route) => {
      return fulfillJson(
        route,
        200,
        analysisCompleted
          ? remainingResponse({
              totalCount: 1,
              remainingCount: 0,
              pendingSubmissionSessionId: null,
              reapplyDDay: 31,
            })
          : remainingResponse({
              totalCount: 1,
              remainingCount: 0,
              pendingSubmissionSessionId: SESSION_ID,
            }),
      );
    });
    await page.route(API.ANALYSIS, async (route) => {
      analysisRequestCount += 1;
      expect(route.request().postData()).toBeNull();
      analysisCompleted = true;
      await fulfillJson(route, 200, {
        status: 'OK',
        code: 200,
        data: {
          interview_session_id: SESSION_ID,
          status: 'TRANSCRIPT_SAVE_REQUESTED',
          next_available_interview_at: '2026-10-13T14:30:00',
        },
        message: 'OK',
      });
    });

    await page.goto('/applicant/dashboard');
    await page.getByRole('button', { name: '면접 결과 제출하기' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '제출' }).click();

    await expect.poll(() => analysisRequestCount).toBe(1);
    await expect(page.getByRole('button', { name: 'AI 면접 진행하기 (1/1)' })).toBeDisabled();
    await expect(page.getByRole('button', { name: '면접 결과 제출하기' })).toBeDisabled();
    await expect(page.getByText('재지원까지 31일 남았습니다.')).toBeVisible();
  });

  test('분석 요청 실패 시 모달을 유지하고 다시 시도할 수 있다', async ({ page }) => {
    await mockDashboardBase(page);
    let analysisRequestCount = 0;

    await page.route(API.REMAINING, (route) =>
      fulfillJson(
        route,
        200,
        remainingResponse({
          totalCount: 1,
          remainingCount: 0,
          pendingSubmissionSessionId: SESSION_ID,
        }),
      ),
    );
    await page.route(API.ANALYSIS, async (route) => {
      analysisRequestCount += 1;
      await fulfillJson(route, 500, {
        status: 'ERROR',
        code: 500,
        data: null,
        message: 'temporary failure',
      });
    });

    await page.goto('/applicant/dashboard');
    await page.getByRole('button', { name: '면접 결과 제출하기' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '제출' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert')).toHaveText(
      '면접 결과 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    );
    await dialog.getByRole('button', { name: '다시 시도' }).click();
    await expect.poll(() => analysisRequestCount).toBe(2);
    await expect(dialog).toBeVisible();
  });
});
