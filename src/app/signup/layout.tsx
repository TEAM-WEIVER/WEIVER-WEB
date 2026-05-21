import type { ReactNode } from 'react';

import { Header } from '@/components/common/header';

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      <main className="flex justify-center px-4 pt-[34px] pb-20">
        <div className="border-border-light bg-bg-primary w-full max-w-[1062px] rounded-[20px] border p-6 md:p-11">
          {children}
        </div>
      </main>
    </div>
  );
}
