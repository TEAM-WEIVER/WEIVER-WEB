import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  description: string;
  hideTitle?: boolean;
  children: ReactNode;
}

export function AuthCard({ title, description, hideTitle, children }: AuthCardProps) {
  return (
    <main className="bg-bg-secondary flex min-h-dvh items-center justify-center px-4 py-6 sm:py-10">
      <div className="bg-card w-full max-w-[420px] rounded-[20px] px-6 pt-10 pb-8 sm:px-10 sm:pt-[74px] sm:pb-12">
        <header className="mb-7 text-center">
          <img
            src={`${import.meta.env.BASE_URL}weiver.svg`}
            alt=""
            width={72}
            height={18}
            className="mx-auto mb-6"
          />
          <h1 className={cn('text-h2 text-text-secondary mb-1.5', hideTitle && 'sr-only')}>
            {title}
          </h1>
          <p className="text-body2 text-text-tertiary">{description}</p>
        </header>

        {children}
      </div>
    </main>
  );
}
