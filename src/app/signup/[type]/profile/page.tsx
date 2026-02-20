'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSignupStore } from '@/store/signup-store';

/* ─── 기업 프로필 폼 ─── */

function CorporateProfileForm() {
  const { profile, setProfile } = useSignupStore();

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">기업명</label>
        <Input
          type="text"
          value={(profile.companyName as string) ?? ''}
          onChange={(e) => setProfile({ companyName: e.target.value })}
          placeholder="기업명을 입력하세요"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">사업자등록번호</label>
        <Input
          type="text"
          value={(profile.businessNumber as string) ?? ''}
          onChange={(e) => setProfile({ businessNumber: e.target.value })}
          placeholder="000-00-00000"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">담당자명</label>
        <Input
          type="text"
          value={(profile.managerName as string) ?? ''}
          onChange={(e) => setProfile({ managerName: e.target.value })}
          placeholder="담당자 이름을 입력하세요"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">연락처</label>
        <Input
          type="tel"
          value={(profile.phone as string) ?? ''}
          onChange={(e) => setProfile({ phone: e.target.value })}
          placeholder="010-0000-0000"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>
    </div>
  );
}

/* ─── 개인 프로필 폼 ─── */

function IndividualProfileForm() {
  const { profile, setProfile } = useSignupStore();

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">이름</label>
        <Input
          type="text"
          value={(profile.name as string) ?? ''}
          onChange={(e) => setProfile({ name: e.target.value })}
          placeholder="이름을 입력하세요"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-body1 text-[var(--text-primary)]">연락처</label>
        <Input
          type="tel"
          value={(profile.phone as string) ?? ''}
          onChange={(e) => setProfile({ phone: e.target.value })}
          placeholder="010-0000-0000"
          className="text-body2 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3.5 shadow-none placeholder:text-[var(--text-disabled)]"
        />
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */

export default function ProfilePage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const { profile } = useSignupStore();

  const isCorporate = params.type === 'corporate';

  const isCorporateValid =
    isCorporate &&
    (profile.companyName as string)?.trim() &&
    (profile.businessNumber as string)?.trim() &&
    (profile.managerName as string)?.trim() &&
    (profile.phone as string)?.trim();

  const isIndividualValid =
    !isCorporate && (profile.name as string)?.trim() && (profile.phone as string)?.trim();

  const isFormValid = isCorporate ? !!isCorporateValid : !!isIndividualValid;

  const handleSubmit = () => {
    router.push(`/signup/${params.type}/complete`);
  };

  const handleBack = () => {
    router.push(`/signup/${params.type}/account`);
  };

  return (
    <div className="flex flex-col gap-11">
      <div className="flex flex-col gap-8">
        {/* 타이틀 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-[var(--text-secondary)]">
            {isCorporate ? '기업 정보를 입력해주세요.' : '기본 정보를 입력해주세요.'}
          </h1>
          <p className="text-body2 text-[var(--text-tertiary)]">
            {isCorporate
              ? '3단계 : 기업 인증을 위한 정보를 입력해주세요.'
              : '3단계 : 프로필에 표시될 기본 정보를 입력해주세요.'}
          </p>
        </div>

        {/* type에 따라 다른 폼 렌더링 */}
        {isCorporate ? <CorporateProfileForm /> : <IndividualProfileForm />}
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleBack}
          className="gap-1 border-[var(--border-default)]"
        >
          <ArrowLeft size={16} />
          이전 단계
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={!isFormValid}
          onClick={handleSubmit}
          className={
            isFormValid
              ? ''
              : 'bg-[var(--primary-200)] text-[var(--text-tertiary)] hover:bg-[var(--primary-200)] disabled:opacity-100'
          }
        >
          완료
        </Button>
      </div>
    </div>
  );
}
