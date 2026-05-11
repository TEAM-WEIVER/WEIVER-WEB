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
  void payload;
  throw new Error('회원가입 API가 아직 연결되지 않았습니다.');
}
