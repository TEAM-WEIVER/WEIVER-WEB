import type { ComponentProps } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getHeaderGivenName } from '@/lib/header-profile-name';

type HeaderProfileButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** API에서 받은 전체 성명. 원형에만 축약한 이름을 표시한다. */
  fullName?: string | null;
};

export function HeaderProfileButton({
  fullName,
  className,
  'aria-label': ariaLabel,
  ...props
}: HeaderProfileButtonProps) {
  const name = fullName?.trim() ?? '';
  const avatarName = getHeaderGivenName(name);

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
        {avatarName || <UserRound className="size-4" />}
      </span>
      <span>{name || '내 계정'}</span>
      <ChevronDown aria-hidden="true" className="text-text-tertiary size-4" />
    </Button>
  );
}
