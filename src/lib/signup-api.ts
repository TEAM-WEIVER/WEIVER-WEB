import type { SignupCompanyInfo, SignupType } from '@/store/signup-store';

interface CompleteSignupPayload {
  type: SignupType;
  account: {
    email: string;
    companyName?: string;
  };
  terms: Record<string, boolean>;
  companyInfo?: SignupCompanyInfo;
}

export async function completeSignup(payload: CompleteSignupPayload): Promise<void> {
  // TODO: 실제 회원가입 API 연동 시 서버가 Set-Cookie로 httpOnly 인증 쿠키를 설정하도록 교체합니다.
  void payload;
}
