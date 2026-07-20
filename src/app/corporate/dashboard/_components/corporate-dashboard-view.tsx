'use client';

import { useMemo } from 'react';

import {
  useCompanyDashboard,
  useDashboardJobPostings,
  useNotifications,
  useReadNotification,
} from '@/hooks/corporate/use-dashboard';
import { useMyCompany } from '@/hooks/corporate/use-company';
import type { CompanyType } from '@/schemas/corporate/company';
import type { Notification } from '@/schemas/corporate/dashboard';

import { CompanySummaryCard } from './company-summary-card';
import { JobPostingList } from './job-posting-list';
import { MatchingNotificationCard } from './matching-notification-card';

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  LARGE_ENTERPRISE: '대기업',
  MIDDLE_MARKET: '중견기업',
  SME: '중소기업',
  STARTUP: '스타트업',
  VENTURE: '벤처기업',
};

const WORK_STYLE_LABELS = {
  FAST_EXECUTION: '빠른 실행',
  CAREFUL_EXECUTION: '신중한 실행',
  RESPECT_INDIVIDUAL: '개인 존중',
  TEAM_CONSENSUS: '팀 합의',
  CLEAR_RESPONSIBILITY: '명확한 역할',
  FLEXIBLE_ROLE: '유연한 역할',
  EXPERIMENT_ORIENTED: '실험 지향',
  STABILITY_ORIENTED: '안정 지향',
} as const;

function getCompanyTypeLabel(companyType?: CompanyType | null) {
  return companyType ? COMPANY_TYPE_LABELS[companyType] : undefined;
}

function getWorkStyleLabel(workStyle?: string | null) {
  return WORK_STYLE_LABELS[workStyle as keyof typeof WORK_STYLE_LABELS] ?? workStyle;
}

function flattenNotifications(data: Record<string, Notification[]> | null) {
  return Object.values(data ?? {}).flat();
}

function CompanySummarySkeleton() {
  return (
    <section
      className="border-border-light bg-bg-primary flex min-h-[286px] flex-col rounded-[20px] border p-6 lg:p-[34px]"
      aria-label="기업 요약 로딩 중"
    >
      <div className="flex animate-pulse flex-col gap-3.5">
        <div className="flex items-center gap-6">
          <div className="bg-bg-tertiary size-[88px] shrink-0 rounded-[10px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="bg-bg-tertiary h-7 w-40 rounded-md" />
            <div className="bg-bg-tertiary h-5 w-24 rounded-md" />
          </div>
        </div>
        <div className="grid gap-3.5 min-[560px]:grid-cols-[154px_1fr]">
          <div className="bg-bg-tertiary h-[70px] rounded-[10px]" />
          <div className="bg-bg-tertiary h-[70px] rounded-[10px]" />
          <div className="bg-bg-tertiary h-[70px] rounded-[10px]" />
          <div className="bg-bg-tertiary h-[70px] rounded-[10px]" />
        </div>
      </div>
    </section>
  );
}

function NotificationSkeleton() {
  return (
    <section
      className="border-border-light bg-bg-primary flex min-h-[286px] flex-col rounded-[20px] border p-6 lg:p-[34px]"
      aria-label="매칭 알림 로딩 중"
    >
      <div className="border-border-light flex h-[70px] flex-col gap-2 border-b">
        <div className="bg-bg-tertiary h-7 w-40 animate-pulse rounded-md" />
        <div className="bg-bg-tertiary h-4 w-52 animate-pulse rounded-md" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="border-border-light flex h-[66px] animate-pulse items-center gap-3.5 border-b px-3.5"
          >
            <div className="bg-bg-tertiary h-[38px] w-[39px] shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="bg-bg-tertiary h-5 w-full max-w-[300px] rounded-md" />
              <div className="bg-bg-tertiary h-4 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CorporateDashboardView() {
  const companyDashboard = useCompanyDashboard();
  const companyInfo = useMyCompany();
  const jobPostings = useDashboardJobPostings({ page: 0, size: 3 });
  const notifications = useNotifications();
  const readNotification = useReadNotification();

  const company = useMemo(
    () =>
      companyDashboard.data || companyInfo.data
        ? {
            companyId: companyDashboard.data?.companyId ?? 0,
            companyLogoUrl:
              companyDashboard.data?.companyLogoUrl ?? companyInfo.data?.companyLogoUrl,
            companyCeoName:
              companyDashboard.data?.companyCeoName ?? companyInfo.data?.companyCeoName,
            address: companyDashboard.data?.address ?? companyInfo.data?.address,
            employeeNum: companyDashboard.data?.employeeNum ?? companyInfo.data?.employeeNum,
            foundedYear: companyDashboard.data?.foundedYear ?? companyInfo.data?.foundedYear,
            wayOfWorkingDetail: companyDashboard.data?.wayOfWorkingDetail ?? {
              workPace: getWorkStyleLabel(companyInfo.data?.workPace),
              decisionMaking: getWorkStyleLabel(companyInfo.data?.decisionMaking),
              roleDefinition: getWorkStyleLabel(companyInfo.data?.roleDefinition),
              operationStyle: getWorkStyleLabel(companyInfo.data?.operationStyle),
            },
            companyName: companyInfo.data?.companyName,
            companyType: getCompanyTypeLabel(companyInfo.data?.companyType),
          }
        : null,
    [companyDashboard.data, companyInfo.data],
  );

  const notificationItems = useMemo(
    () => flattenNotifications(notifications.data),
    [notifications.data],
  );

  const handleNotificationClick = (notification: Notification) => {
    if (notification.isRead) return;

    void readNotification.mutate(notification.notificationId).catch(() => undefined);
  };

  const shouldShowCompanySkeleton =
    (companyDashboard.isLoading || companyInfo.isLoading) && !company;
  const shouldShowNotificationSkeleton = notifications.isLoading && !notifications.data;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid gap-6 min-[1180px]:grid-cols-2">
        {shouldShowCompanySkeleton ? (
          <CompanySummarySkeleton />
        ) : (
          <CompanySummaryCard
            company={
              company ?? {
                companyId: 0,
              }
            }
          />
        )}
        {shouldShowNotificationSkeleton ? (
          <NotificationSkeleton />
        ) : (
          <MatchingNotificationCard
            notifications={notificationItems}
            onNotificationClick={handleNotificationClick}
          />
        )}
      </div>

      <JobPostingList postings={jobPostings.data?.content ?? []} />
    </div>
  );
}
