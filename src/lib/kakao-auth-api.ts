import type { UserRole } from './auth-token';
import { apiRequest } from './api-client';
import { buildApplicantAgreements } from './signup-api';

interface ApiResponse<T> {
  status: string;
  code: number;
  data: T;
  message: string;
}

export interface KakaoSession {
  accessToken: string;
  role: UserRole;
}

export type KakaoExchangeResult =
  | ({ status: 'LOGGED_IN' } & KakaoSession)
  | { status: 'SIGNUP_REQUIRED'; signupToken: string; verifiedEmail?: string }
  | { status: 'EXISTING_ACCOUNT' | 'PENDING_ACCOUNT'; verifiedEmail: string };

const KAKAO_PATH = '/api/auth/applicants/kakao';
// Public OAuth POSTs still require CSRF, but must never refresh/replay an auth request.
const publicOAuthOptions = {
  method: 'POST',
  credentials: 'include',
  skipAuthorization: true,
  skipAuthRetry: true,
} as const;

export async function startKakaoOAuth() {
  const response = await apiRequest<ApiResponse<{ authorizationUrl: string; flowId: string }>>(
    `${KAKAO_PATH}/start`,
    publicOAuthOptions,
  );
  return response.data;
}

export async function exchangeKakaoOAuth(flowId: string) {
  const response = await apiRequest<ApiResponse<KakaoExchangeResult>>(`${KAKAO_PATH}/exchange`, {
    ...publicOAuthOptions,
    body: { flowId },
  });
  return response.data;
}

export async function completeKakaoSignup(
  signupToken: string,
  terms: Record<string, boolean>,
  emailVerification?: { email: string; verificationToken: string },
) {
  const response = await apiRequest<ApiResponse<KakaoSession>>(`${KAKAO_PATH}/signup/complete`, {
    ...publicOAuthOptions,
    body: {
      signupToken,
      agreements: buildApplicantAgreements(terms),
      ...emailVerification,
    },
  });
  return response.data;
}
