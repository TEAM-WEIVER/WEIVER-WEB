import { LogoutButton } from '@/components/common/logout-button';
import { Button } from '@/components/ui/button';

export default function ApplicantMyPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2 text-text-secondary">마이페이지</h1>
        <p className="text-body2 text-text-tertiary">계정 정보를 관리할 수 있습니다.</p>
      </header>

      <section className="border-border-light bg-bg-primary flex min-h-[240px] flex-col justify-between rounded-[20px] border px-6 py-7 lg:px-[34px]">
        <div className="flex flex-col gap-2">
          <h2 className="text-h3 text-text-secondary">계정</h2>
          <p className="text-body2 text-text-tertiary">현재 제공되는 계정 작업은 로그아웃입니다.</p>
        </div>

        <div className="flex justify-end">
          <LogoutButton asChild>
            <Button type="button" variant="outline" size="xs">
              로그아웃
            </Button>
          </LogoutButton>
        </div>
      </section>
    </div>
  );
}
