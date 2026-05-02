'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, MessageSquare, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/corporate/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/corporate/recruitment', label: '채용 관리', icon: FileText },
  { href: '/corporate/applicants', label: '지원자 관리', icon: Users },
  { href: '/corporate/interviews', label: '면접 관리', icon: MessageSquare },
  { href: '/corporate/settings', label: '설정', icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border-light bg-bg-primary flex h-screen w-[240px] shrink-0 flex-col border-r">
      {/* 로고 */}
      <div className="flex h-16 items-center px-6">
        <Link href="/corporate/dashboard" className="text-h3 text-primary-700">
          PIUDA
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-body2 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-bg-tertiary text-primary-700'
                  : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 로그아웃 */}
      <div className="border-border-light border-t px-3 py-4">
        <button
          type="button"
          className="text-body2 text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
        >
          <LogOut size={20} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="border-border-light bg-bg-primary flex h-16 items-center justify-end border-b px-8">
          <div className="flex items-center gap-3">
            <div className="bg-bg-tertiary flex h-9 w-9 items-center justify-center rounded-full">
              <span className="text-caption text-text-tertiary">P</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
