/**
 * 회원가입 API 응답 픽스처
 * Playwright page.route()와 함께 사용한다.
 *
 * 이메일 인증과 계정 등록은 실제 API 베이스 URL로 요청하고,
 * 가입 완료는 브라우저에서 Next.js Route Handler로 요청한다.
 */

export const API = {
  EMAIL_SEND: '**/api/auth/applicants/email/send',
  EMAIL_VERIFY: '**/api/auth/applicants/email/verify',
  SIGNUP_INIT: '**/api/auth/applicants/signup/init',
  SIGNUP_COMPLETE: '**/api/auth/signup/complete',
} as const;

const success = <TData>(data: TData) => ({
  status: 'OK',
  code: 200,
  data,
  message: 'OK',
});

const failure = (code: number, message: string) => ({
  status: 'ERROR',
  code,
  data: null,
  message,
});

export const FIXTURES = {
  emailSend: {
    success: { status: 200, body: success('') },
    failure: { status: 500, body: failure(500, '이메일 전송에 실패했습니다.') },
  },
  emailVerify: {
    success: {
      status: 200,
      body: success({ verificationToken: 'mock-verification-token-abc123' }),
    },
    failure: { status: 400, body: failure(400, '인증번호가 올바르지 않습니다.') },
  },
  signupInit: {
    success: { status: 200, body: success({ signupToken: 'mock-signup-token-xyz789' }) },
    failure: { status: 400, body: failure(400, '회원가입 계정 등록에 실패했습니다.') },
  },
  signupComplete: {
    success: { status: 200, body: success({ role: 'APPLICANT' }) },
    failure: {
      status: 500,
      body: failure(500, '회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    },
  },
} as const;
