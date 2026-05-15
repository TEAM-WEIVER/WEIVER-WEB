import type { SignupCompanyInfo, SignupType } from '@/store/signup-store';

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

interface CompleteSignupPayload {
  type: SignupType;
  account: {
    email: string;
    signupToken?: string;
    companyName?: string;
  };
  terms: Record<string, boolean>;
  companyInfo?: SignupCompanyInfo;
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

export async function completeSignup(payload: CompleteSignupPayload): Promise<void> {
  void payload;
  throw new Error('회원가입 API가 아직 연결되지 않았습니다.');
}
