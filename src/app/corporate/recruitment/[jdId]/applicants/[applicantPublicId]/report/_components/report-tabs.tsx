import Link from 'next/link';

import { cn } from '@/lib/utils';

export const REPORT_TABS = [
  { value: 'summary', label: '요약' },
  { value: 'skill-fit', label: '스킬핏' },
  { value: 'culture-fit', label: '컬처핏' },
  { value: 'documents', label: '제출서류' },
] as const;

export type ReportTab = (typeof REPORT_TABS)[number]['value'];

export function normalizeReportTab(value: string | string[] | undefined): ReportTab {
  const nextValue = Array.isArray(value) ? value[0] : value;
  return REPORT_TABS.some((tab) => tab.value === nextValue) ? (nextValue as ReportTab) : 'summary';
}

export function ReportTabs({ activeTab }: { activeTab: ReportTab }) {
  return (
    <nav className="flex h-[64px] items-end gap-10" aria-label="지원자 리포트 탭">
      {REPORT_TABS.map((tab) => {
        const isActive = tab.value === activeTab;

        return (
          <Link
            key={tab.value}
            href={`?tab=${tab.value}`}
            className={cn(
              'text-h4 flex h-full items-center border-b-2 px-1 transition-colors',
              isActive
                ? 'border-primary-700 text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary border-transparent',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
