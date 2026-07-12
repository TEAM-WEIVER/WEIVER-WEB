'use client';

import { Building2, FileText, LayoutDashboard } from 'lucide-react';

import { AppSidebar } from '@/components/common/app-sidebar';
import { CorporateDashboardView } from '@/app/corporate/dashboard/_components/corporate-dashboard-view';

const PREVIEW_NAV_ITEMS = [
  { href: '/corporate-dashboard-preview', label: '대시보드', icon: LayoutDashboard },
  { href: '/corporate/recruitment', label: '채용 관리', icon: FileText },
] as const;

export default function CorporateDashboardPreviewPage() {
  return (
    <div className="bg-bg-secondary flex h-screen overflow-hidden">
      <AppSidebar
        homeHref="/corporate-dashboard-preview"
        items={PREVIEW_NAV_ITEMS}
        profileHref="/corporate/settings"
        profileLabel="기업 설정"
        profileIcon={Building2}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1368px] px-6 py-[34px] lg:px-20">
          <CorporateDashboardView />
        </div>
      </main>
    </div>
  );
}
