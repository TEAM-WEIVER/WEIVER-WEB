import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router';

import { TERMS_PATH, PRIVACY_PATH, SUPPORT_PATH } from '@/lib/service-paths';
import { cn } from '@/lib/utils';

export type MemberFooterLink = { label: string; to: string };

const defaultLinks: readonly MemberFooterLink[] = [
  { label: '이용약관', to: TERMS_PATH },
  { label: '개인정보처리방침', to: PRIVACY_PATH },
  { label: '고객지원', to: SUPPORT_PATH },
];

type MemberFooterProps = ComponentProps<'footer'> & { links?: readonly MemberFooterLink[] };

export function MemberFooter({ links = defaultLinks, className, ...props }: MemberFooterProps) {
  const navigate = useNavigate();
  return (
    <footer {...props} className={cn('bg-bg-secondary text-text-secondary', className)}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-15">
        <nav aria-label="서비스 안내">
          <ul className="text-caption flex flex-wrap items-center gap-x-6 gap-y-3">
            {links.map(({ label, to }) => (
              <li key={label} className="max-w-full min-w-0 wrap-anywhere">
                <button
                  type="button"
                  onClick={() => navigate(to)}
                  className="hover:text-text-primary focus-visible:outline-primary-600 cursor-pointer rounded-sm text-left wrap-anywhere underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <small className="text-caption shrink-0">© weiver. All rights reserved.</small>
      </div>
    </footer>
  );
}
