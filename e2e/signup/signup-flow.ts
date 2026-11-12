import { expect, type Page } from '@playwright/test';

export async function fillSignupAccount(
  page: Page,
  { email, code, password }: { email: string; code: string; password: string },
) {
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByRole('button', { name: '인증번호 전송' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByLabel('이메일 인증번호').fill(code);
  await page.getByRole('button', { name: '인증번호 확인' }).click();
  await expect(page.getByText('인증 완료')).toBeVisible();

  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(password);
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page).toHaveURL('/signup/agreements');
}

export async function acceptRequiredAgreements(page: Page) {
  for (const name of [
    /서비스 이용약관/,
    /개인정보 처리방침/,
    /개인회원 이용약관/,
    /AI 분석에 동의/,
    /민감정보 처리에 동의/,
  ]) {
    await page.getByRole('checkbox', { name }).check();
  }
}
