import { expect, test, type Page } from '@playwright/test';

const passwordResetURL = '/login/password-reset';
const passwordResetAPI = '**/api/auth/applicants/password';
const accountEmail = 'user@example.com';
const verificationToken = 'verification-token';
const newPassword = 'NewPassword123!';

async function requestCode(page: Page) {
  await page.getByLabel('이메일', { exact: true }).fill(accountEmail);
  await page.getByRole('button', { name: '인증번호 받기' }).click();
  await expect(page.getByLabel('인증번호', { exact: true })).toBeFocused();
}

async function verifyCode(page: Page, code = '123456') {
  await page.getByLabel('인증번호', { exact: true }).fill(code);
  await page.getByRole('button', { name: '인증번호 확인' }).click();
}

async function submitPassword(page: Page, confirmation = newPassword) {
  await page.getByLabel('새 비밀번호', { exact: true }).fill(newPassword);
  await page.getByLabel('새 비밀번호 확인', { exact: true }).fill(confirmation);
  await page.getByRole('button', { name: '비밀번호 변경', exact: true }).click();
}

test('이메일 인증, 재전송, 비밀번호 변경을 거쳐 로그인으로 돌아간다', async ({ page }) => {
  await page.clock.install();
  let sendCount = 0;
  await page.route('**/api/auth/**', (route) => route.abort());
  await page.route(`${passwordResetAPI}/email/send`, (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.postDataJSON()).toEqual({ email: accountEmail });
    expect(request.headers()).not.toHaveProperty('authorization');
    expect(request.headers()).not.toHaveProperty('x-xsrf-token');
    sendCount += 1;
    return route.fulfill({ json: { data: null } });
  });
  await page.route(`${passwordResetAPI}/email/verify`, (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    const code = request.postDataJSON().code;
    expect(request.postDataJSON()).toEqual({ email: accountEmail, code });
    if (code !== '123456') {
      return route.fulfill({ status: 400, json: { errorCode: 'INVALID_VERIFICATION_CODE' } });
    }
    return route.fulfill({ json: { data: { verificationToken } } });
  });
  await page.route(passwordResetAPI, (route) => {
    const request = route.request();
    expect(request.method()).toBe('PATCH');
    expect(request.postDataJSON()).toEqual({
      email: accountEmail,
      verificationToken,
      newPassword,
      newPasswordConfirm: newPassword,
    });
    return route.fulfill({ json: { data: null } });
  });

  await page.goto('/login');
  await page.getByRole('link', { name: '비밀번호를 잊으셨나요?' }).click();
  await expect(page).toHaveURL(passwordResetURL);
  await page.reload();
  await expect(page.getByRole('heading', { name: '비밀번호 재설정' })).toBeVisible();

  await requestCode(page);
  await expect(page.getByText('등록된 이메일이라면 인증번호가 발송됩니다.')).toBeVisible();
  const resend = page.getByRole('button', { name: '재전송', exact: true });
  await expect(resend).toBeDisabled();

  await verifyCode(page, '111111');
  await expect(page.getByRole('alert')).toContainText('인증번호가 올바르지 않습니다.');

  await page.clock.fastForward(61_000);
  await resend.click();
  await expect(page.getByLabel('인증번호', { exact: true })).toHaveValue('');
  expect(sendCount).toBe(2);

  await verifyCode(page);
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toBeFocused();
  await submitPassword(page, 'DifferentPassword123!');
  await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  await submitPassword(page);
  await expect(page).toHaveURL('/login');
  await expect(page.getByText('비밀번호를 변경했습니다. 다시 로그인해주세요.')).toBeVisible();
});

test('재설정 토큰이 만료되면 이메일 인증부터 다시 진행한다', async ({ page }) => {
  await page.route(`${passwordResetAPI}/email/send`, (route) =>
    route.fulfill({ json: { data: null } }),
  );
  await page.route(`${passwordResetAPI}/email/verify`, (route) =>
    route.fulfill({ json: { data: { verificationToken } } }),
  );
  await page.route(passwordResetAPI, (route) =>
    route.fulfill({ status: 403, json: { errorCode: 'EMAIL_NOT_VERIFIED' } }),
  );

  expect((await page.goto(passwordResetURL))?.status()).toBe(200);
  await requestCode(page);
  await verifyCode(page);
  await submitPassword(page);

  await expect(page.getByRole('alert')).toContainText(
    '이메일 인증이 만료되었거나 이미 사용되었습니다.',
  );
  await expect(page.getByLabel('이메일', { exact: true })).toHaveValue(accountEmail);
  await expect(page.getByLabel('새 비밀번호', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '인증번호 받기' })).toBeEnabled();
});
