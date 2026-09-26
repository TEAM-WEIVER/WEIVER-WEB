import { expect, test, type Page, type Route } from '@playwright/test';

const PROFILE_API = '**/api/applicants';
const CHANGE_PASSWORD_API = '**/api/auth/applicants/me/password';
const WITHDRAW_API = '**/api/auth/applicants/me';

const apiResponse = <TData>(data: TData, message = 'OK') => ({
  status: 'OK',
  code: 200,
  data,
  message,
});

async function fulfillJson(route: Route, status: number, body: object) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setupApplicantSession(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('weiver.auth.role', 'APPLICANT');
  });

  await page.route('**/api/auth/csrf', (route) =>
    fulfillJson(route, 200, apiResponse({ csrfToken: 'mock-csrf-token' })),
  );
  await page.route('**/api/auth/reissue', (route) =>
    fulfillJson(route, 200, apiResponse({ accessToken: 'mock-access-token' })),
  );
  await page.route(PROFILE_API, (route) =>
    fulfillJson(
      route,
      200,
      apiResponse({
        ApplicantDTO: {
          email: 'personal@gmail.com',
          name: '테스트 지원자',
          address: '서울특별시',
          birthday: '2000-01-01',
          phoneNumber: '010-1234-5678',
          photoUrl: null,
        },
        EducationDTO: [],
        AwardDTO: [],
        WorkExperienceDTO: [],
        CertificateDTO: [],
      }),
    ),
  );
}

async function gotoAccountSettings(page: Page) {
  await setupApplicantSession(page);
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();
}

async function fillPasswordForm(page: Page, overrides: Partial<Record<string, string>> = {}) {
  await page
    .getByRole('textbox', { name: '현재 비밀번호', exact: true })
    .fill(overrides.currentPassword ?? 'Current1!');
  await page
    .getByRole('textbox', { name: '새 비밀번호', exact: true })
    .fill(overrides.newPassword ?? 'NewPassword1!');
  await page
    .getByRole('textbox', { name: '새 비밀번호 확인', exact: true })
    .fill(overrides.newPasswordConfirm ?? overrides.newPassword ?? 'NewPassword1!');
}

test('AC1: 마이페이지의 계정 설정 카드로 계정 설정 화면에 이동한다', async ({ page }) => {
  await setupApplicantSession(page);
  await page.goto('/applicant/mypage');

  await page.getByRole('link', { name: '계정 설정' }).click();

  await expect(page).toHaveURL('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();
});

test('AC2: 계정 설정 화면은 이메일과 현재·새 비밀번호 입력을 한 번에 제공한다', async ({
  page,
}) => {
  await gotoAccountSettings(page);

  await expect(page.getByLabel('이메일')).toHaveValue('personal@gmail.com');
  await expect(page.getByLabel('이메일')).toBeDisabled();
  await expect(page.getByRole('textbox', { name: '현재 비밀번호', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '새 비밀번호', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '새 비밀번호 확인', exact: true })).toBeVisible();
  await expect(page.getByText('8자 이상 14자 이하여야 합니다.')).toBeVisible();
});

test('AC3: 유효한 비밀번호를 제출하면 API 요청 후 로그인 화면으로 이동한다', async ({ page }) => {
  await setupApplicantSession(page);
  let requestBody: unknown;

  await page.route(CHANGE_PASSWORD_API, async (route) => {
    requestBody = route.request().postDataJSON();
    await fulfillJson(route, 200, apiResponse(null));
  });
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();
  await fillPasswordForm(page);

  await page.getByRole('button', { name: '비밀번호 변경 완료' }).click();

  await expect
    .poll(() => requestBody)
    .toEqual({
      currentPassword: 'Current1!',
      newPassword: 'NewPassword1!',
      newPasswordConfirm: 'NewPassword1!',
    });
  await expect(page).toHaveURL('/login');
});

test('AC4: 새 비밀번호 확인이 불일치하면 요청 없이 토스트를 표시하고 입력값을 유지한다', async ({
  page,
}) => {
  await gotoAccountSettings(page);
  let requestCount = 0;
  await page.route(CHANGE_PASSWORD_API, (route) => {
    requestCount += 1;
    return fulfillJson(route, 200, apiResponse(null));
  });
  await fillPasswordForm(page, { newPasswordConfirm: 'Different1!' });

  await page.getByRole('button', { name: '비밀번호 변경 완료' }).click();

  await expect(page.getByRole('alert', { name: '계정 설정 알림' })).toContainText(
    '새 비밀번호가 일치하지 않습니다.',
  );
  await expect(page.getByRole('textbox', { name: '새 비밀번호 확인', exact: true })).toHaveValue(
    'Different1!',
  );
  expect(requestCount).toBe(0);
  await expect(page).toHaveURL('/applicant/mypage/account');
});

test('AC5: 8~14자 규칙 위반이면 요청 없이 토스트를 표시한다', async ({ page }) => {
  await gotoAccountSettings(page);
  let requestCount = 0;
  await page.route(CHANGE_PASSWORD_API, (route) => {
    requestCount += 1;
    return fulfillJson(route, 200, apiResponse(null));
  });
  await fillPasswordForm(page, { newPassword: 'Short1!', newPasswordConfirm: 'Short1!' });

  await page.getByRole('button', { name: '비밀번호 변경 완료' }).click();

  await expect(page.getByRole('alert', { name: '계정 설정 알림' })).toContainText(
    '비밀번호는 8자 이상 14자 이하여야 합니다.',
  );
  expect(requestCount).toBe(0);
});

test('AC6: 현재 비밀번호 불일치 API 오류는 토스트로 표시하고 입력값을 유지한다', async ({
  page,
}) => {
  await setupApplicantSession(page);
  await page.route(CHANGE_PASSWORD_API, (route) =>
    fulfillJson(route, 400, {
      status: 'BAD_REQUEST',
      code: 400,
      data: null,
      message: '현재 비밀번호가 일치하지 않습니다.',
    }),
  );
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();
  await fillPasswordForm(page);

  await page.getByRole('button', { name: '비밀번호 변경 완료' }).click();

  await expect(page.getByRole('alert', { name: '계정 설정 알림' })).toContainText(
    '현재 비밀번호가 일치하지 않습니다.',
  );
  await expect(page.getByRole('textbox', { name: '현재 비밀번호', exact: true })).toHaveValue(
    'Current1!',
  );
  await expect(page).toHaveURL('/applicant/mypage/account');
});

test('AC7: 변경 요청 중에는 버튼을 비활성화해 중복 제출을 막는다', async ({ page }) => {
  await setupApplicantSession(page);
  let releaseRequest: (() => void) | undefined;
  await page.route(CHANGE_PASSWORD_API, async (route) => {
    await new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await fulfillJson(route, 200, apiResponse(null));
  });
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();
  await fillPasswordForm(page);

  const submitButton = page.getByRole('button', { name: /비밀번호 변경/ });
  await submitButton.click();

  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => releaseRequest).toBeDefined();
  releaseRequest!();
  await expect(page).toHaveURL('/login');
});

test('AC8: 회원 탈퇴를 취소하면 API를 호출하지 않고 계정 설정 화면에 머문다', async ({ page }) => {
  await gotoAccountSettings(page);
  let requestCount = 0;
  await page.route(WITHDRAW_API, (route) => {
    requestCount += 1;
    return fulfillJson(route, 200, apiResponse(null));
  });

  await page.getByRole('button', { name: '회원 탈퇴' }).click();
  await expect(page.getByRole('dialog', { name: '회원 탈퇴' })).toBeVisible();

  await page.getByRole('button', { name: '취소' }).click();

  await expect(page.getByRole('dialog', { name: '회원 탈퇴' })).toBeHidden();
  expect(requestCount).toBe(0);
  await expect(page).toHaveURL('/applicant/mypage/account');
});

test('AC9: 회원 탈퇴 확인 시 API 성공 후 로그인 화면으로 이동한다', async ({ page }) => {
  await setupApplicantSession(page);
  let deleteCalled = false;
  await page.route(WITHDRAW_API, async (route) => {
    deleteCalled = route.request().method() === 'DELETE';
    await fulfillJson(route, 200, apiResponse(null));
  });
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();

  await page.getByRole('button', { name: '회원 탈퇴' }).click();
  await page.getByRole('button', { name: '탈퇴하기' }).click();

  await expect(page).toHaveURL('/login');
  expect(deleteCalled).toBe(true);
});

test('AC10: 회원 탈퇴 API 실패 시 토스트를 표시하고 계정 설정 화면을 유지한다', async ({
  page,
}) => {
  await setupApplicantSession(page);
  await page.route(WITHDRAW_API, (route) =>
    fulfillJson(route, 500, {
      status: 'INTERNAL_SERVER_ERROR',
      code: 500,
      data: null,
      message: '회원 탈퇴에 실패했습니다. 다시 시도해주세요.',
    }),
  );
  await page.goto('/applicant/mypage/account');
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible();

  await page.getByRole('button', { name: '회원 탈퇴' }).click();
  await page.getByRole('button', { name: '탈퇴하기' }).click();

  await expect(page.getByRole('alert', { name: '계정 설정 알림' })).toContainText(
    '회원 탈퇴에 실패했습니다. 다시 시도해주세요.',
  );
  await expect(page).toHaveURL('/applicant/mypage/account');
});
