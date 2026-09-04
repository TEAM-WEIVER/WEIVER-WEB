'use client';

import { useEffect, useState } from 'react';

import { useRouteNavigation } from '@/hooks/use-route-navigation';

import {
  type ApplicantProfileOverview,
  getApplicantProfileOverview,
} from '@/lib/applicant-profile-api';
import { getProfileEditPath, type OnboardingProgress } from '@/lib/onboarding-flow';

import { HiringProcessCard } from './_components/hiring-process-card';
import { InterviewCallout } from './_components/interview-callout';
import { ProfileOverviewCard } from './_components/profile-overview-card';
import { ReapplyNotice } from './_components/reapply-notice';

const EMPTY_PROGRESS: OnboardingProgress = {
  resume: false,
  'cover-letter': false,
  portfolio: false,
};

export default function ApplicantDashboardPage() {
  const { push } = useRouteNavigation();
  const [overview, setOverview] = useState<ApplicantProfileOverview | null>(null);
  const [hasOverviewError, setHasOverviewError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getApplicantProfileOverview()
      .then((nextOverview) => {
        if (isMounted) {
          setOverview(nextOverview);
          setHasOverviewError(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOverview(null);
          setHasOverviewError(true);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const progress = overview?.progress ?? EMPTY_PROGRESS;
  const isProfileReady = Object.values(progress).every(Boolean);

  const handleProfileEdit = () => {
    push(getProfileEditPath(progress));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {hasOverviewError && (
        // TODO: 실패 창이나 모달 추후에 하나 만들긴 해야 할 듯
        <p className="text-body2 text-text-tertiary">
          프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {isLoading ? (
        <>
          <section aria-label="프로필 로딩 중">
            <div className="border-border-light bg-bg-primary flex animate-pulse flex-col gap-4 rounded-[20px] border p-6">
              <div className="flex items-center gap-4">
                <div className="bg-bg-tertiary size-16 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="bg-bg-tertiary h-6 w-32 rounded-md" />
                  <div className="bg-bg-tertiary h-4 w-20 rounded-md" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-bg-tertiary h-3 w-full rounded-full" />
                <div className="bg-bg-tertiary h-3 w-full rounded-full" />
                <div className="bg-bg-tertiary h-3 w-3/4 rounded-full" />
              </div>
            </div>
          </section>

          <div className="grid gap-[23px] min-[1440px]:grid-cols-[798px_387px]">
            <section aria-label="채용 절차 로딩 중">
              <div className="border-border-light bg-bg-primary flex animate-pulse flex-col gap-4 rounded-[20px] border p-6">
                <div className="bg-bg-tertiary h-6 w-40 rounded-md" />
                <div className="flex gap-3">
                  <div className="bg-bg-tertiary h-20 flex-1 rounded-[10px]" />
                  <div className="bg-bg-tertiary h-20 flex-1 rounded-[10px]" />
                  <div className="bg-bg-tertiary h-20 flex-1 rounded-[10px]" />
                  <div className="bg-bg-tertiary h-20 flex-1 rounded-[10px]" />
                </div>
              </div>
            </section>

            <section aria-label="면접 로딩 중">
              <div className="border-border-light bg-bg-primary flex animate-pulse flex-col gap-4 rounded-[20px] border p-6">
                <div className="bg-bg-tertiary size-10 rounded-full" />
                <div className="flex flex-col gap-2">
                  <div className="bg-bg-tertiary h-5 w-3/4 rounded-md" />
                  <div className="bg-bg-tertiary h-4 w-1/2 rounded-md" />
                </div>
                <div className="bg-bg-tertiary h-9 w-full rounded-md" />
              </div>
            </section>
          </div>

          <ReapplyNotice />
        </>
      ) : (
        <>
          <ProfileOverviewCard
            applicant={overview?.applicant}
            progress={progress}
            onEditProfile={handleProfileEdit}
          />

          <div className="grid gap-[23px] min-[1440px]:grid-cols-[798px_387px]">
            <HiringProcessCard isDocumentAnalysisReady={isProfileReady} />
            <InterviewCallout canStartInterview={isProfileReady} />
          </div>

          <ReapplyNotice />
        </>
      )}
    </div>
  );
}
