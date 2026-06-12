/**
 * 회원가입 API 응답 픽스처
 * Playwright page.route()와 함께 사용한다.
 *
 * 실제 API 베이스 URL: https://api.piuda.site
 * Next.js rewrites를 통해 /api/* -> https://api.piuda.site/api/* 로 프록시된다.
 * E2E 인터셉트 경로는 /api/* 기준으로 작성한다.
 */

export const API = {
  EMAIL_SEND: '**/api/auth/applicants/email/send',
  EMAIL_VERIFY: '**/api/auth/applicants/email/verify',
  SIGNUP_INIT: '**/api/auth/applicants/signup/init',
  SIGNUP_AGREEMENTS: '**/api/auth/applicants/signup/agreements',
} as const;

export const FIXTURES = {
  emailSend: {
    success: { status: 200, body: null },
    failure: { status: 500, body: { message: '이메일 전송에 실패했습니다.' } },
  },
  emailVerify: {
    success: { status: 200, body: { verificationToken: 'mock-verification-token-abc123' } },
    failure: { status: 400, body: { message: '인증번호가 올바르지 않습니다.' } },
  },
  signupInit: {
    success: { status: 200, body: { signupToken: 'mock-signup-token-xyz789' } },
    failure: { status: 400, body: { message: '회원가입 계정 등록에 실패했습니다.' } },
  },
  signupAgreements: {
    success: { status: 200, body: { accessToken: 'mock-access-token', role: 'APPLICANT' } },
    failure: {
      status: 500,
      body: { message: '회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' },
    },
  },
} as const;
