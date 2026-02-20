'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';

import { Header } from '@/components/common/header';
import { useSignupStore } from '@/store/signup-store';
import type { SignupType } from '@/store/signup-store';

const VALID_TYPES: readonly string[] = ['corporate', 'individual'];

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ type: string }>();
  const setType = useSignupStore((state) => state.setType);

  const type = params.type;

  // type 유효성 검사
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid signup type: ${type}`);
  }

  // store에 type 동기화
  useEffect(() => {
    setType(type as SignupType);
  }, [type, setType]);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <Header />

      <main className="flex justify-center px-4 pt-[34px] pb-20">
        <div className="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-primary)] p-11">
          {children}
        </div>
      </main>
    </div>
  );
}
