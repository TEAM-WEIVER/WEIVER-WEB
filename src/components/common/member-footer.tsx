import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type MemberFooterLink = {
  label: string;
  /** 목적지가 확정된 링크만 전달한다. */
  href?: string;
};

const defaultLinks: readonly MemberFooterLink[] = [
  { label: '이용약관' },
  { label: '개인정보처리방침' },
  { label: '고객지원' },
];

type MemberFooterProps = ComponentProps<'footer'> & {
  links?: readonly MemberFooterLink[];
};

export function MemberFooter({ links = defaultLinks, className, ...props }: MemberFooterProps) {
  return (
    <footer {...props} className={cn('bg-bg-secondary text-text-secondary', className)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-15">
        <nav aria-label="서비스 안내">
          <ul className="text-caption flex flex-wrap items-center gap-x-6 gap-y-3">
            {links.map(({ label, href }) => (
              <li key={label} className="max-w-full min-w-0 wrap-anywhere">
                {href ? (
                  <a
                    href={href}
                    className="hover:text-text-primary focus-visible:outline-primary-600 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    {label}
                  </a>
                ) : (
                  <span aria-disabled="true" title="준비 중">
                    {label}
                    <span className="sr-only"> (준비 중)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <small className="text-caption shrink-0">© weiver. All rights reserved.</small>
      </div>
    </footer>
  );
}
