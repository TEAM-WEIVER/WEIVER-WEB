import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { LogoutButton } from '@/components/common/logout-button';
import { Button } from '@/components/ui/button';

export default function ApplicantMyPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2 text-text-secondary">마이페이지</h1>
        <p className="text-body2 text-text-tertiary">계정 정보를 관리할 수 있습니다.</p>
      </header>

      <Link
        href="/applicant/mypage/account"
        aria-label="계정 설정"
        className="border-border-light bg-bg-primary hover:border-border-default flex flex-col gap-2 rounded-lg border px-5 py-[13px] transition-colors"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-h3 text-text-secondary">계정 설정</h2>
          <ChevronRight className="text-primary-600" size={24} aria-hidden="true" />
        </div>
        <p className="text-body1 text-text-tertiary">이메일, 비밀번호를 설정할 수 있습니다.</p>
      </Link>

      <section className="border-border-light bg-bg-primary flex items-center justify-between rounded-lg border px-5 py-[13px]">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 text-text-secondary">로그아웃</h2>
          <p className="text-body1 text-text-tertiary">현재 로그인된 계정에서 로그아웃합니다.</p>
        </div>
        <LogoutButton asChild>
          <Button type="button" variant="outline" size="xs">
            로그아웃
          </Button>
        </LogoutButton>
      </section>
    </div>
  );
}
