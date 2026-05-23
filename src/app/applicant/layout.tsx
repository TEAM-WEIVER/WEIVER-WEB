'use client';

import Link from 'next/link';
import { CircleHelp, LayoutDashboard, Settings, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/applicant/dashboard', label: '대시보드', icon: LayoutDashboard },
] as const;

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-bg-secondary flex h-screen overflow-hidden">
      <aside className="bg-primary-700 flex min-h-screen w-[72px] shrink-0 flex-col items-center px-3.5 py-[34px] text-white">
        <Link
          href="/applicant/dashboard"
          aria-label="피우다 홈"
          className="text-h3 mb-6 flex h-11 w-full items-center justify-center font-black"
        >
          W
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={`flex size-11 items-center justify-center rounded-md transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-primary-300 hover:bg-primary-600'
                }`}
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
          <div className="bg-bg-primary text-primary-500 flex size-11 items-center justify-center rounded-md">
            <UserRound size={24} />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1368px] px-6 py-[34px] lg:px-20">{children}</div>
      </main>
    </div>
  );
}
