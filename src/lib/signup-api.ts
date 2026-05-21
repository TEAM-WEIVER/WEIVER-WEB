import type { SignupAccount } from '@/store/signup-store';

import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface InitApplicantSignupPayload {
  email: string;
  password: string;
  passwordConfirm: string;
  verificationToken: string;
}

interface InitApplicantSignupData {
  signupToken: string;
}

interface VerifyApplicantEmailPayload {
  email: string;
  code: string;
}

interface VerifyApplicantEmailData {
  verificationToken: string;
}

interface CompleteApplicantSignupData {
  publicId: string;
  role: string;
}

interface CompleteSignupPayload {
  account: SignupAccount;
  terms: Record<string, boolean>;
}

interface CompleteApplicantSignupRequest {
  signupToken: string;
  agreements: {
    termsOfService: boolean;
    privacyPolicy: boolean;
    individualMemberTerms: boolean;
    aiAnalysisConsent: boolean;
    sensitiveDataConsent: boolean;
    marketingConsent: boolean;
  };
}

export async function initApplicantSignup(payload: InitApplicantSignupPayload) {
  return apiRequest<ApiResponse<InitApplicantSignupData>>('/api/auth/applicants/signup/init', {
    method: 'POST',
    body: payload,
  });
}

export async function sendApplicantVerificationEmail(email: string) {
  return apiRequest<ApiResponse<string>>('/api/auth/applicants/email/send', {
    method: 'POST',
    body: { email },
  });
}

export async function verifyApplicantEmail(payload: VerifyApplicantEmailPayload) {
  return apiRequest<ApiResponse<VerifyApplicantEmailData>>('/api/auth/applicants/email/verify', {
    method: 'POST',
    body: payload,
  });
}

function buildCompleteApplicantSignupRequest(
  payload: CompleteSignupPayload,
): CompleteApplicantSignupRequest {
  const { signupToken } = payload.account;
  const { terms } = payload;

  if (!signupToken) {
    throw new Error('개인 회원가입 토큰이 없습니다.');
  }

  return {
    signupToken,
    agreements: {
      termsOfService: terms.serviceTerms,
      privacyPolicy: terms.privacyPolicy,
      individualMemberTerms: terms.individualTerms,
      aiAnalysisConsent: terms.aiAnalysisConsent,
      sensitiveDataConsent: terms.sensitiveDataConsent,
      marketingConsent: terms.marketingConsent,
    },
  };
}

export async function completeSignup(payload: CompleteSignupPayload): Promise<void> {
  await apiRequest<ApiResponse<CompleteApplicantSignupData>>(
    '/api/auth/applicants/signup/agreements',
    {
      method: 'POST',
      body: buildCompleteApplicantSignupRequest(payload),
    },
  );
}
