'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheckBig } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSignupStore } from '@/store/signup-store';

export default function SignupCompletionPage() {
  const router = useRouter();
  const reset = useSignupStore((s) => s.reset);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="bg-primary-100 flex h-16 w-16 items-center justify-center rounded-full">
        <CircleCheckBig size={32} className="text-primary-700" />
      </div>

      <div className="flex flex-col items-center gap-3.5">
        <h1 className="text-h2 text-text-secondary">회원가입이 완료되었습니다!</h1>
        <p className="text-body2 text-text-tertiary text-center">
          개인 회원으로 가입이 완료되었습니다.
          <br />
          나에게 맞는 공고를 찾아보세요.
        </p>
      </div>

      <Button type="button" size="md" onClick={handleGoToLogin}>
        로그인하기
      </Button>
    </div>
  );
}
