'use client';

import { cloneElement, isValidElement, type ReactElement, type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { logout } from '@/lib/auth-api';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  asChild?: boolean;
  children?: ReactNode;
  className?: string;
  iconSize?: number;
  label?: string;
  showLabel?: boolean;
}

export function LogoutButton({
  asChild = false,
  children,
  className,
  iconSize = 20,
  label = '로그아웃',
  showLabel = true,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // 로그아웃 API가 실패해도 로컬 인증 상태는 auth-api에서 정리된다.
    } finally {
      router.replace('/login');
      setIsLoggingOut(false);
    }
  };

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ disabled?: boolean; onClick?: () => void }>, {
      disabled: isLoggingOut,
      onClick: handleLogout,
    });
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={isLoggingOut}
      onClick={handleLogout}
      className={cn(className, isLoggingOut && 'cursor-not-allowed opacity-60')}
    >
      <LogOut size={iconSize} />
      {showLabel ? label : null}
    </button>
  );
}
