import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { Header } from '@/components/common/header';
import type { SignupType } from '@/store/signup-store';
import { SignupTypeSync } from '@/app/signup/[type]/signup-type-sync';

const VALID_TYPES = ['corporate', 'individual'] as const;

function isSignupType(type: string): type is SignupType {
  return VALID_TYPES.includes(type as SignupType);
}

export default async function SignupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  if (!isSignupType(type)) {
    notFound();
  }

  return (
    <div className="bg-bg-secondary min-h-screen">
      <SignupTypeSync type={type} />
      <Header />

      <main className="flex justify-center px-4 pt-[34px] pb-20">
        <div className="border-border-light bg-bg-primary w-full max-w-[1062px] rounded-[20px] border p-6 md:p-11">
          {children}
        </div>
      </main>
    </div>
  );
}
