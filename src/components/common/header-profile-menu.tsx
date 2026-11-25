import type { ComponentProps } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { HeaderProfileButton } from './header-profile-button';
import { LogoutButton } from './logout-button';

type HeaderProfileMenuProps = ComponentProps<typeof HeaderProfileButton> & {
  onRetryProfile?: () => void;
};

export function HeaderProfileMenu({ onRetryProfile, ...props }: HeaderProfileMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <HeaderProfileButton {...props} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        aria-label="내 계정"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-0 rounded-md p-1 shadow-sm"
      >
        {onRetryProfile ? (
          <DropdownMenuItem
            onSelect={onRetryProfile}
            aria-label="프로필 다시 불러오기"
            className="min-h-9 rounded-sm px-2 py-1.5 text-[13px]"
          >
            다시 불러오기
          </DropdownMenuItem>
        ) : null}
        <LogoutButton asChild>
          <DropdownMenuItem className="min-h-9 rounded-sm px-2 py-1.5 text-[13px]">
            로그아웃
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
