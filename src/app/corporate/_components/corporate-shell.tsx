'use client';

import { Building2, FileText, LayoutDashboard } from 'lucide-react';

import { AppSidebar } from '@/components/common/app-sidebar';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';

const NAV_ITEMS = [
  { href: '/corporate/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/corporate/recruitment', label: '채용 관리', icon: FileText },
] as const;

type CorporateShellProps = {
  children: React.ReactNode;
  bypassGuard?: boolean;
};

export function CorporateShell({ children, bypassGuard = false }: CorporateShellProps) {
  return (
    <div className="bg-bg-secondary flex h-screen overflow-hidden">
      <AppSidebar
        homeHref="/corporate/dashboard"
        items={NAV_ITEMS}
        profileHref="/corporate/settings"
        profileLabel="기업 설정"
        profileIcon={Building2}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1368px] px-6 py-[34px] lg:px-20">
          {bypassGuard ? (
            children
          ) : (
            <ProtectedRouteGuard area="corporate">{children}</ProtectedRouteGuard>
          )}
        </div>
      </main>
    </div>
  );
}
