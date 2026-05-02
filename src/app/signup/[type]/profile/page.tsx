'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useSignupStore } from '@/store/signup-store';

/* ─── 기업 프로필 폼 ─── */

function CorporateProfileForm() {
  const { profile, setProfile } = useSignupStore();

  return (
    <div className="flex w-full flex-col gap-4">
      <FormField label="기업명">
        <Input
          type="text"
          value={(profile.companyName as string) ?? ''}
          onChange={(e) => setProfile({ companyName: e.target.value })}
          placeholder="기업명을 입력하세요"
        />
      </FormField>

      <FormField label="사업자등록번호">
        <Input
          type="text"
          value={(profile.businessNumber as string) ?? ''}
          onChange={(e) => setProfile({ businessNumber: e.target.value })}
          placeholder="000-00-00000"
        />
      </FormField>

      <FormField label="담당자명">
        <Input
          type="text"
          value={(profile.managerName as string) ?? ''}
          onChange={(e) => setProfile({ managerName: e.target.value })}
          placeholder="담당자 이름을 입력하세요"
        />
      </FormField>

      <FormField label="연락처">
        <Input
          type="tel"
          value={(profile.phone as string) ?? ''}
          onChange={(e) => setProfile({ phone: e.target.value })}
          placeholder="010-0000-0000"
        />
      </FormField>
    </div>
  );
}

/* ─── 개인 프로필 폼 ─── */

function IndividualProfileForm() {
  const { profile, setProfile } = useSignupStore();

  return (
    <div className="flex w-full flex-col gap-4">
      <FormField label="이름">
        <Input
          type="text"
          value={(profile.name as string) ?? ''}
          onChange={(e) => setProfile({ name: e.target.value })}
          placeholder="이름을 입력하세요"
        />
      </FormField>

      <FormField label="연락처">
        <Input
          type="tel"
          value={(profile.phone as string) ?? ''}
          onChange={(e) => setProfile({ phone: e.target.value })}
          placeholder="010-0000-0000"
        />
      </FormField>
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
          <h1 className="text-h2 text-text-secondary">
            {isCorporate ? '기업 정보를 입력해주세요.' : '기본 정보를 입력해주세요.'}
          </h1>
          <p className="text-body2 text-text-tertiary">
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
          className="border-border-default gap-1"
        >
          <ArrowLeft size={16} />
          이전 단계
        </Button>
        <Button type="button" size="xs" disabled={!isFormValid} onClick={handleSubmit}>
          완료
        </Button>
      </div>
    </div>
  );
}
