'use client';

import { LayoutDashboard } from 'lucide-react';

import { AppSidebar } from '@/components/common/app-sidebar';
import { ProtectedRouteGuard } from '@/components/common/protected-route-guard';

const NAV_ITEMS = [
  { href: '/applicant/dashboard', label: '대시보드', icon: LayoutDashboard },
] as const;

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary flex h-screen overflow-hidden">
      <AppSidebar
        homeHref="/applicant/dashboard"
        items={NAV_ITEMS}
        profileHref="/applicant/mypage"
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1368px] px-6 py-[34px] lg:px-20">
          <ProtectedRouteGuard area="applicant">{children}</ProtectedRouteGuard>
        </div>
      </main>
    </div>
  );
}
