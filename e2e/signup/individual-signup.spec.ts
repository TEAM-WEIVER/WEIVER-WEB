import { test, expect, type Page, type Route } from '@playwright/test';
import { API, FIXTURES } from '../mocks/signup-handlers';

// ---------------------------------------------------------------------------
// 헬퍼 — route 등록
// ---------------------------------------------------------------------------

async function mockRoute(
  page: Page,
  url: string,
  fixture: { status: number; body: object | null },
) {
  await page.route(url, (route: Route) => {
    if (fixture.body === null) {
      route.fulfill({ status: fixture.status });
    } else {
      route.fulfill({
        status: fixture.status,
        contentType: 'application/json',
        body: JSON.stringify(fixture.body),
      });
    }
  });
}

// 정상 플로우 공통 전제: 이메일 전송 + 검증 + 계정 제출 모두 성공
async function setupHappyPath(page: Page) {
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await mockRoute(page, API.EMAIL_VERIFY, FIXTURES.emailVerify.success);
  await mockRoute(page, API.SIGNUP_INIT, FIXTURES.signupInit.success);
  await mockRoute(page, API.SIGNUP_AGREEMENTS, FIXTURES.signupAgreements.success);
}

// ---------------------------------------------------------------------------
// 이메일 인증 단계 공통 헬퍼
// ---------------------------------------------------------------------------

async function gotoAccountInfo(page: Page) {
  await page.goto('/signup/account-info');
}

async function fillEmail(page: Page, email = 'test@example.com') {
  await page.getByLabel('이메일').fill(email);
}

async function sendVerificationCode(page: Page) {
  await page.getByRole('button', { name: '인증번호 전송' }).click();
}

async function verifyCode(page: Page, code = '123456') {
  await page.getByLabel('이메일 인증번호').fill(code);
  await page.getByRole('button', { name: '확인', exact: true }).click();
}

async function fillPassword(page: Page, pw = 'Password1!') {
  await page.getByLabel('비밀번호').fill(pw);
  await page.getByRole('textbox', { name: '비밀번호 확인' }).fill(pw);
}

// ---------------------------------------------------------------------------
// AC1. 이메일 인증번호 전송
// ---------------------------------------------------------------------------

test('AC1: 유효한 이메일 입력 후 인증번호 전송 버튼 클릭 시 타이머와 인증번호 입력 필드가 표시된다', async ({
  page,
}) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await gotoAccountInfo(page);

  // When
  await fillEmail(page);
  await sendVerificationCode(page);

  // Then — 타이머 표시 (role="timer")
  await expect(page.getByRole('timer')).toBeVisible();

  // Then — 인증번호 입력 필드와 확인 버튼 표시
  await expect(page.getByLabel('이메일 인증번호')).toBeVisible();
  await expect(page.getByRole('button', { name: '확인', exact: true })).toBeVisible();

  // Then — 인증번호 전송 버튼 비활성화 (중복 요청 방지)
  await expect(page.getByRole('button', { name: '인증번호 전송' })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC2. 이메일 인증번호 검증 성공
// ---------------------------------------------------------------------------

test('AC2: 올바른 인증번호 입력 후 확인 클릭 시 인증 완료 상태가 표시된다', async ({ page }) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await mockRoute(page, API.EMAIL_VERIFY, FIXTURES.emailVerify.success);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await expect(page.getByLabel('이메일 인증번호')).toBeVisible();

  // When
  await verifyCode(page);

  // Then — "인증 완료" 상태 텍스트 표시
  await expect(page.getByText('인증 완료')).toBeVisible();

  // Then — 타이머 정지 (더 이상 보이지 않거나 숨겨짐)
  await expect(page.getByRole('timer')).toBeHidden();

  // Then — 이메일 입력 필드와 인증번호 전송 버튼 비활성화 (읽기 전용)
  await expect(page.getByLabel('이메일')).toBeDisabled();
  await expect(page.getByRole('button', { name: '인증번호 전송' })).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC3. 계정 정보 제출 및 1단계 완료
// ---------------------------------------------------------------------------

test('AC3: 이메일 인증 완료 + 비밀번호 입력 후 다음 단계 클릭 시 /signup/agreements로 이동한다', async ({
  page,
}) => {
  // Given
  await setupHappyPath(page);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await verifyCode(page);
  await expect(page.getByText('인증 완료')).toBeVisible();

  // When
  await fillPassword(page);
  await page.getByRole('button', { name: '다음 단계' }).click();

  // Then
  await expect(page).toHaveURL('/signup/agreements');
});

// ---------------------------------------------------------------------------
// AC4. 약관 동의 및 가입 완료
// ---------------------------------------------------------------------------

test('AC4: 필수 약관 4개 모두 동의 후 다음 단계 클릭 시 /onboarding/resume으로 이동한다', async ({
  page,
}) => {
  // Given — signupToken을 Zustand store에 세팅하려면 account-info 단계를 거쳐야 한다
  await setupHappyPath(page);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await verifyCode(page);
  await fillPassword(page);
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page).toHaveURL('/signup/agreements');

  // When — 필수 약관 4개 체크
  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 처리방침/ }).check();
  await page.getByRole('checkbox', { name: /개인회원 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /AI 분석 동의/ }).check();
  await page.getByRole('button', { name: '다음 단계' }).click();

  // Then
  await expect(page).toHaveURL('/onboarding/resume');
});

// ---------------------------------------------------------------------------
// AC5. 약관 동의 API 실패 에러 처리
// ---------------------------------------------------------------------------

test('AC5: 약관 동의 API 실패 시 에러 메시지를 표시하고 페이지를 유지한다', async ({ page }) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await mockRoute(page, API.EMAIL_VERIFY, FIXTURES.emailVerify.success);
  await mockRoute(page, API.SIGNUP_INIT, FIXTURES.signupInit.success);
  await mockRoute(page, API.SIGNUP_AGREEMENTS, FIXTURES.signupAgreements.failure);

  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await verifyCode(page);
  await fillPassword(page);
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page).toHaveURL('/signup/agreements');

  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 처리방침/ }).check();
  await page.getByRole('checkbox', { name: /개인회원 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /AI 분석 동의/ }).check();

  // When
  await page.getByRole('button', { name: '다음 단계' }).click();

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  ).toBeVisible();

  // Then — 페이지 유지 (리다이렉트 없음)
  await expect(page).toHaveURL('/signup/agreements');
});

// ---------------------------------------------------------------------------
// AC6. 인증번호 만료 후 재전송
// ---------------------------------------------------------------------------

test('AC6: 타이머 만료 후 재전송 버튼이 표시되고, 클릭 시 타이머가 재시작된다', async ({
  page,
}) => {
  // Given — 타이머를 5분 대기하는 대신, 타이머가 만료된 상태를 강제 주입한다
  // 실제 구현이 useTimer 훅의 isExpired를 클라이언트에서 관리하므로,
  // 짧은 타이머 구현이 없을 경우 이 테스트는 E2E 환경에서 page.clock.runFor()로 진행한다.
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await gotoAccountInfo(page);

  // 브라우저 시계를 가로채 5분(300,000ms)을 즉시 진행
  await page.clock.install();
  await fillEmail(page);
  await sendVerificationCode(page);
  await expect(page.getByRole('timer')).toBeVisible();

  // When — 5분 경과
  await page.clock.runFor(5 * 60 * 1000);

  // Then — 인증번호 입력 필드, 확인 버튼 비활성화
  await expect(page.getByLabel('이메일 인증번호')).toBeDisabled();
  await expect(page.getByRole('button', { name: '확인', exact: true })).toBeDisabled();

  // Then — 재전송 버튼 표시
  await expect(page.getByRole('button', { name: '재전송' })).toBeVisible();

  // When — 재전송 클릭
  await page.getByRole('button', { name: '재전송' }).click();

  // Then — 타이머 재시작
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByLabel('이메일 인증번호')).toBeEnabled();
});

// ---------------------------------------------------------------------------
// AC7. 재전송 횟수 제한 (클라이언트 카운트 기준, 3회 초과 시 차단)
// ---------------------------------------------------------------------------

test('AC7: 인증번호를 3회 전송한 후 4번째 재전송 시 횟수 초과 메시지가 표시되고 API를 호출하지 않는다', async ({
  page,
}) => {
  // Given
  let sendCallCount = 0;
  await page.route(API.EMAIL_SEND, (route) => {
    sendCallCount++;
    route.fulfill({ status: 200 });
  });

  await gotoAccountInfo(page);
  await page.clock.install();
  await fillEmail(page);

  // 1회 전송
  await sendVerificationCode(page);
  await expect(page.getByRole('timer')).toBeVisible();

  // 타이머 만료 후 재전송 2회 (총 3회)
  for (let i = 0; i < 2; i++) {
    await page.clock.runFor(5 * 60 * 1000);
    await expect(page.getByRole('button', { name: '재전송' })).toBeVisible();
    await page.getByRole('button', { name: '재전송' }).click();
    await expect(page.getByRole('timer')).toBeVisible();
  }

  // 타이머 만료 (3회 이후)
  await page.clock.runFor(5 * 60 * 1000);

  // When — 4번째 재전송 시도
  await expect(page.getByRole('button', { name: '재전송' })).toBeVisible();
  await page.getByRole('button', { name: '재전송' }).click();

  // Then — 횟수 초과 메시지
  await expect(
    page.getByText('인증번호 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'),
  ).toBeVisible();

  // Then — 재전송 버튼 비활성화
  await expect(page.getByRole('button', { name: '재전송' })).toBeDisabled();

  // Then — API 호출은 3회만 발생 (4번째 호출 없음)
  expect(sendCallCount).toBe(3);
});

// ---------------------------------------------------------------------------
// AC8-a. 이메일 인증번호 전송 실패
// ---------------------------------------------------------------------------

test('AC8-a: 이메일 전송 API 실패 시 에러 메시지가 표시되고 타이머가 시작되지 않는다', async ({
  page,
}) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.failure);
  await gotoAccountInfo(page);
  await fillEmail(page);

  // When
  await sendVerificationCode(page);

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  ).toBeVisible();

  // Then — 타이머 미표시
  await expect(page.getByRole('timer')).toBeHidden();

  // Then — 전송 버튼 재활성화
  await expect(page.getByRole('button', { name: '인증번호 전송' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// AC8-b. 인증번호 검증 실패 (코드 불일치)
// ---------------------------------------------------------------------------

test('AC8-b: 잘못된 인증번호 입력 후 확인 클릭 시 에러 메시지가 표시되고 타이머는 계속 진행된다', async ({
  page,
}) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await mockRoute(page, API.EMAIL_VERIFY, FIXTURES.emailVerify.failure);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await expect(page.getByRole('timer')).toBeVisible();

  // When
  await verifyCode(page, '000000');

  // Then — 에러 메시지 표시
  await expect(page.getByText('인증번호가 올바르지 않습니다. 다시 확인해주세요.')).toBeVisible();

  // Then — "인증 완료" 상태 미표시
  await expect(page.getByText('인증 완료')).toBeHidden();

  // Then — 타이머 계속 진행 중
  await expect(page.getByRole('timer')).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC9. 계정 정보 제출 실패 에러 처리
// ---------------------------------------------------------------------------

test('AC9: 계정 정보 제출 API 실패 시 에러 메시지가 표시되고 페이지를 유지한다', async ({
  page,
}) => {
  // Given
  await mockRoute(page, API.EMAIL_SEND, FIXTURES.emailSend.success);
  await mockRoute(page, API.EMAIL_VERIFY, FIXTURES.emailVerify.success);
  await mockRoute(page, API.SIGNUP_INIT, FIXTURES.signupInit.failure);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await verifyCode(page);
  await expect(page.getByText('인증 완료')).toBeVisible();
  await fillPassword(page);

  // When
  await page.getByRole('button', { name: '다음 단계' }).click();

  // Then — 에러 메시지 표시
  await expect(
    page.getByText('회원가입 계정 등록에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  ).toBeVisible();

  // Then — 페이지 유지
  await expect(page).toHaveURL('/signup/account-info');
});

// ---------------------------------------------------------------------------
// AC10. 약관 미동의 시 제출 버튼 비활성화
// ---------------------------------------------------------------------------

test('AC10: 필수 약관 미동의 시 다음 단계 버튼이 비활성화 상태이다', async ({ page }) => {
  // Given — signupToken이 있는 상태를 만들기 위해 account-info 단계를 완료한다
  await setupHappyPath(page);
  await gotoAccountInfo(page);
  await fillEmail(page);
  await sendVerificationCode(page);
  await verifyCode(page);
  await fillPassword(page);
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page).toHaveURL('/signup/agreements');

  // When — 아무 약관도 체크하지 않은 상태에서 버튼 확인
  const submitButton = page.getByRole('button', { name: '다음 단계' });

  // Then — 버튼 비활성화
  await expect(submitButton).toBeDisabled();

  // When — 필수 약관 중 일부만 체크
  await page.getByRole('checkbox', { name: /서비스 이용약관/ }).check();
  await page.getByRole('checkbox', { name: /개인정보 처리방침/ }).check();
  // 나머지 2개 미체크

  // Then — 여전히 비활성화
  await expect(submitButton).toBeDisabled();
});

// ---------------------------------------------------------------------------
// AC11. signupToken 없이 약관 단계 직접 접근 → 리다이렉트
// ---------------------------------------------------------------------------

test('AC11: signupToken 없이 /signup/agreements 직접 접근 시 /signup/account-info로 리다이렉트된다', async ({
  page,
}) => {
  // Given — Zustand store가 비어 있는 상태(새로고침 또는 직접 URL 접근)
  // Playwright는 각 테스트마다 새 컨텍스트를 사용하므로 store는 초기 상태

  // When
  await page.goto('/signup/agreements');

  // Then — account-info로 리다이렉트
  await expect(page).toHaveURL('/signup/account-info');
});
