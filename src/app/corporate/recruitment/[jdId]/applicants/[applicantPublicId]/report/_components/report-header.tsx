import Link from 'next/link';
import { ChevronRight, Mail, Phone, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { CardSummary } from '@/schemas/corporate/report';

import { ReportTabs, type ReportTab } from './report-tabs';

type ReportHeaderProps = {
  activeTab: ReportTab;
  cardSummary: CardSummary;
  jdId: string;
};

export function ReportHeader({ activeTab, cardSummary, jdId }: ReportHeaderProps) {
  const profile = cardSummary.profile;

  return (
    <header className="bg-bg-primary border-border-light border-b">
      <div className="mx-auto flex w-full max-w-[1208px] flex-col">
        <div className="flex items-center gap-1.5 pt-6">
          <Link href="/corporate/dashboard" className="text-caption text-text-disabled">
            공고목록
          </Link>
          <ChevronRight className="text-text-disabled size-4" />
          <Link href={`/corporate/recruitment/${jdId}`} className="text-caption text-text-disabled">
            공고상세
          </Link>
          <ChevronRight className="text-text-disabled size-4" />
          <p className="text-caption text-text-primary">상세리포트</p>
        </div>

        <div className="flex items-center justify-between gap-6 py-8">
          <div className="flex min-w-0 items-center gap-6">
            <div className="bg-primary-200 flex size-[104px] shrink-0 items-center justify-center rounded-full">
              <span className="text-h1 text-primary-700">{profile?.name?.slice(0, 1) ?? '김'}</span>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="border-info bg-bg-tertiary text-body2 text-text-primary inline-flex h-7 items-center rounded-md border px-2">
                  신입
                </span>
                <h1 className="text-h1 text-text-primary">{profile?.name ?? '지원자'}</h1>
              </div>

              <div className="text-body2 text-text-tertiary flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {profile?.phoneNumber ?? '-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4" />
                  {profile?.email ?? '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="border-error text-error hover:bg-error/5 h-[42px] w-[132px] rounded-[10px] bg-transparent shadow-none"
            >
              <Trash2 className="size-4" />
              리포트 삭제하기
            </Button>
            <Button type="button" size="xs" className="h-[42px] w-[132px] rounded-[10px]">
              지원자 컨택하기
            </Button>
          </div>
        </div>

        <ReportTabs activeTab={activeTab} />
      </div>
    </header>
  );
}
