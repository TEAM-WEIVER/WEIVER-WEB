import type { ReactNode } from 'react';

import { LoginFooter } from './login-footer';

export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <main className="bg-bg-secondary flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10">
      <div className="bg-card w-full max-w-[420px] rounded-2xl px-6 pt-10 pb-8 sm:px-10 sm:pt-[72px] sm:pb-12">
        <header className="mb-7 flex flex-col items-center gap-6 text-center">
          <h1>
            <img
              src={`${import.meta.env.BASE_URL}weiver.svg`}
              alt="WEIVER 로그인"
              width={72}
              height={18}
            />
          </h1>
          <p className="text-body2 text-text-tertiary">
            로그인하고 나만의 전형 준비를 시작해보세요.
          </p>
        </header>

        {children}

        <LoginFooter />
      </div>
    </main>
  );
}
