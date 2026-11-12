import type { ComponentProps } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HeaderProfileButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Given name only, without the family name: 김민수 → 민수. */
  givenName?: string | null;
};

export function HeaderProfileButton({
  givenName,
  className,
  'aria-label': ariaLabel,
  ...props
}: HeaderProfileButtonProps) {
  const name = Array.from(givenName?.trim() ?? '')
    .slice(0, 2)
    .join('');

  return (
    <Button
      type="button"
      {...props}
      variant="ghost"
      aria-label={ariaLabel ?? (name ? `${name} 프로필` : '내 계정')}
      className={cn('text-body2 text-text-secondary h-11 gap-2 px-1.5', className)}
    >
      <span
        aria-hidden="true"
        className="border-border-default bg-bg-tertiary text-caption flex size-8 shrink-0 items-center justify-center rounded-full border"
      >
        {name || <UserRound className="size-4" />}
      </span>
      <span>{name || '내 계정'}</span>
      <ChevronDown aria-hidden="true" className="text-text-tertiary size-4" />
    </Button>
  );
}
