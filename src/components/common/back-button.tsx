import type { ComponentProps } from 'react';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/** 이동 목적지는 소비 페이지가 onClick으로 결정한다. */
export function BackButton({
  children = '뒤로가기',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        'text-text-secondary hover:text-text-primary focus-visible:ring-ring inline-flex min-h-9 items-center gap-1 rounded-sm py-2 text-left text-[13px] leading-[18px] outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </button>
  );
}
