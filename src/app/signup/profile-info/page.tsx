'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useSignupStore } from '@/store/signup-store';

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

export default function SignupProfileInfoPage() {
  const router = useRouter();
  const { profile } = useSignupStore();

  const isFormValid = Boolean(
    (profile.name as string)?.trim() && (profile.phone as string)?.trim(),
  );

  const handleSubmit = () => {
    router.push('/signup/completion');
  };

  const handleBack = () => {
    router.push('/signup/account-info');
  };

  return (
    <div className="flex flex-col gap-11">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">기본 정보를 입력해주세요.</h1>
          <p className="text-body2 text-text-tertiary">
            3단계 : 프로필에 표시될 기본 정보를 입력해주세요.
          </p>
        </div>

        <IndividualProfileForm />
      </div>

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
          가입 완료
        </Button>
      </div>
    </div>
  );
}
