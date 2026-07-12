'use client';

import Link from 'next/link';
import { CircleHelp, Settings, UserRound, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export type AppSidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  homeHref: string;
  items: readonly AppSidebarItem[];
  profileHref: string;
  profileLabel?: string;
  profileIcon?: LucideIcon;
};

export function AppSidebar({
  homeHref,
  items,
  profileHref,
  profileLabel = '마이페이지',
  profileIcon: ProfileIcon = UserRound,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-primary-700 flex min-h-screen w-[72px] shrink-0 flex-col items-center px-3.5 py-[34px] text-white">
      <Link
        href={homeHref}
        aria-label="피우다 홈"
        className="text-h3 mb-6 flex h-11 w-full items-center justify-center font-black"
      >
        W
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                'flex size-11 items-center justify-center rounded-md transition-colors',
                isActive ? 'bg-primary-600 text-white' : 'text-primary-300 hover:bg-primary-600',
              )}
            >
              <Icon size={25} />
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="도움말"
            title="도움말"
            className="text-primary-300 hover:bg-primary-600 flex size-11 items-center justify-center rounded-md"
          >
            <CircleHelp size={24} />
          </button>
          <button
            type="button"
            aria-label="설정"
            title="설정"
            className="text-primary-300 hover:bg-primary-600 flex size-11 items-center justify-center rounded-md"
          >
            <Settings size={24} />
          </button>
        </div>
        <Link
          href={profileHref}
          aria-label={profileLabel}
          title={profileLabel}
          className="bg-bg-primary text-primary-500 flex size-11 items-center justify-center rounded-md"
        >
          <ProfileIcon size={24} />
        </Link>
      </div>
    </aside>
  );
}
