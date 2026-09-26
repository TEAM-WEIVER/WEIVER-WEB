'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouteNavigation } from '@/hooks/use-route-navigation';

import {
  type ApplicantProfileOverview,
  getApplicantProfileOverview,
} from '@/lib/applicant-profile-api';
import { getSubmissionStatus } from '@/lib/onboarding-api';
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

const POLLING_INTERVALS = [10_000, 10_000] as const; // 10초 후 1회, 20초 후 1회

export default function ApplicantDashboardPage() {
  const { push } = useRouteNavigation();
  const [overview, setOverview] = useState<ApplicantProfileOverview | null>(null);
  const [hasOverviewError, setHasOverviewError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pollingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  const clearAllPollingTimers = useCallback(() => {
    pollingTimersRef.current.forEach((id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    pollingTimersRef.current = [];
  }, []);

  const startPolling = useCallback(() => {
    clearAllPollingTimers();

    let pollCount = 0;

    function scheduleNext(delay: number) {
      const timerId = setTimeout(async () => {
        if (!isMountedRef.current) return;

        try {
          const res = await getSubmissionStatus();
          if (!isMountedRef.current) return;

          const { syncStatus } = res.data;

          setOverview((prev: ApplicantProfileOverview | null) =>
            prev
              ? {
                  ...prev,
                  syncStatus: res.data.syncStatus,
                  submitted: res.data.submitted,
                  submittable: res.data.submittable,
                  progress: {
                    resume: res.data.resumeCompleted,
                    'cover-letter': res.data.essayCompleted,
                    portfolio: res.data.portfolioCompleted,
                  },
                }
              : prev,
          );

          if (syncStatus === 'COMPLETED' || syncStatus === 'FAILED') {
            clearAllPollingTimers();
            return;
          }

          pollCount += 1;
          if (pollCount < POLLING_INTERVALS.length) {
            scheduleNext(POLLING_INTERVALS[pollCount]);
          }
        } catch {
          // 폴링 중 에러는 무시하고 중단
          clearAllPollingTimers();
        }
      }, delay);

      pollingTimersRef.current.push(timerId);
    }

    scheduleNext(POLLING_INTERVALS[0]);
  }, [clearAllPollingTimers]);

  useEffect(() => {
    isMountedRef.current = true;

    getApplicantProfileOverview()
      .then((nextOverview) => {
        if (!isMountedRef.current) return;
        setOverview(nextOverview);
        setHasOverviewError(false);

        if (nextOverview.syncStatus === 'REQUESTED') {
          startPolling();
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setOverview(null);
        setHasOverviewError(true);
      })
      .finally(() => {
        if (isMountedRef.current) setIsLoading(false);
      });

    return () => {
      isMountedRef.current = false;
      clearAllPollingTimers();
    };
  }, [startPolling, clearAllPollingTimers]);

  const progress = overview?.progress ?? EMPTY_PROGRESS;
  const isProfileReady = Object.values(progress).every(Boolean);

  const handleProfileEdit = () => {
    push(getProfileEditPath(progress));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {hasOverviewError && (
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
            submitted={overview?.submitted ?? false}
            submittable={overview?.submittable ?? false}
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
