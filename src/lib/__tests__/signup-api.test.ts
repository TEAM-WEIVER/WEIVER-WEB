import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import {
  completeSignup,
  initApplicantSignup,
  sendApplicantVerificationEmail,
  verifyApplicantEmail,
} from '../signup-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('signup-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {},
      message: 'OK',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('회원가입 1단계 계정 정보 등록 요청을 서버 스펙에 맞게 보낸다', async () => {
    await initApplicantSignup({
      email: 'applicant@example.com',
      password: 'Password123!',
      passwordConfirm: 'Password123!',
      verificationToken: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/signup/init', {
      method: 'POST',
      body: {
        email: 'applicant@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        verificationToken: '123e4567-e89b-12d3-a456-426614174000',
      },
    });
  });

  it('이메일 인증번호 전송 요청을 서버 스펙에 맞게 보낸다', async () => {
    await sendApplicantVerificationEmail('applicant@example.com');

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/email/send', {
      method: 'POST',
      body: {
        email: 'applicant@example.com',
      },
    });
  });

  it('이메일 인증번호 검증 요청을 서버 스펙에 맞게 보낸다', async () => {
    await verifyApplicantEmail({
      email: 'applicant@example.com',
      code: '131412',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/email/verify', {
      method: 'POST',
      body: {
        email: 'applicant@example.com',
        code: '131412',
      },
    });
  });

  it('회원가입 2단계 약관 동의 요청을 서버 스펙에 맞게 보낸다', async () => {
    await completeSignup({
      account: {
        email: 'applicant@example.com',
        signupToken: 'signup-token',
      },
      terms: {
        serviceTerms: true,
        privacyPolicy: true,
        individualTerms: true,
        aiAnalysisConsent: true,
        sensitiveDataConsent: true,
        marketingConsent: false,
      },
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/signup/agreements', {
      method: 'POST',
      body: {
        signupToken: 'signup-token',
        agreements: {
          termsOfService: true,
          privacyPolicy: true,
          individualMemberTerms: true,
          aiAnalysisConsent: true,
          sensitiveDataConsent: true,
          marketingConsent: false,
        },
      },
    });
  });

  it('회원가입 2단계에 signupToken이 없으면 요청하지 않는다', async () => {
    await expect(
      completeSignup({
        account: {
          email: 'applicant@example.com',
        },
        terms: {
          serviceTerms: true,
          privacyPolicy: true,
          individualTerms: true,
          aiAnalysisConsent: true,
          sensitiveDataConsent: true,
          marketingConsent: false,
        },
      }),
    ).rejects.toThrow('개인 회원가입 토큰이 없습니다.');

    expect(apiRequest).not.toHaveBeenCalled();
  });
});
