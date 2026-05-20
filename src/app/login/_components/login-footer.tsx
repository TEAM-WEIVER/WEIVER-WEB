import Link from 'next/link';

import { getFirstStep } from '@/lib/signup-flow';

import type { LoginTab } from './login-tabs';

export function LoginFooter({ activeTab }: { activeTab: LoginTab }) {
  return (
    <div className="border-primary-100 flex justify-center border-t pt-6">
      {activeTab === 'individual' ? (
        <div className="flex items-center gap-3">
          <span className="text-body2 text-text-tertiary">아직 회원이 아니신가요?</span>
          <Link
            href={`/signup/${getFirstStep()}`}
            className="text-body2 text-text-primary hover:underline"
          >
            회원가입하기
          </Link>
        </div>
      ) : (
        <span className="text-body2 text-text-tertiary">
          기업 계정 발급은 관리자에게 문의해주세요.
        </span>
      )}
    </div>
  );
}
