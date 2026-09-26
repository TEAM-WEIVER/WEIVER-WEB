'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouteNavigation } from '@/hooks/use-route-navigation';

import { ApiError } from '@/lib/api-client';
import {
  type ApplicantProfileOverview,
  getApplicantProfileOverview,
} from '@/lib/applicant-profile-api';
import { getSubmissionStatus } from '@/lib/onboarding-api';
import { getProfileEditPath, type OnboardingProgress } from '@/lib/onboarding-flow';
import {
  getInterviewRemaining,
  requestInterviewAnalysis,
  type InterviewRemainingData,
} from '@/lib/interview-api';

import { HiringProcessCard } from './_components/hiring-process-card';
import { InterviewCallout } from './_components/interview-callout';
import { InterviewResultSubmitModal } from './_components/interview-result-submit-modal';
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
  const [interviewRemaining, setInterviewRemaining] = useState<InterviewRemainingData | null>(null);
  const [isInterviewLoading, setIsInterviewLoading] = useState(true);
  const [hasInterviewError, setHasInterviewError] = useState(false);
  const [isResultSubmitOpen, setIsResultSubmitOpen] = useState(false);
  const [isResultSubmitting, setIsResultSubmitting] = useState(false);
  const [resultSubmitError, setResultSubmitError] = useState<string | null>(null);
  const pollingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);
  const submittedSessionIdsRef = useRef(new Set<string>());

  const clearAllPollingTimers = useCallback(() => {
    pollingTimersRef.current.forEach((id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    pollingTimersRef.current = [];
  }, []);

  const loadInterviewRemaining = useCallback(async (): Promise<boolean> => {
    setIsInterviewLoading(true);
    try {
      const response = await getInterviewRemaining();
      if (!isMountedRef.current) return false;
      setInterviewRemaining(response.data);
      setHasInterviewError(false);
      return true;
    } catch {
      if (!isMountedRef.current) return false;
      setInterviewRemaining(null);
      setHasInterviewError(true);
      return false;
    } finally {
      if (isMountedRef.current) setIsInterviewLoading(false);
    }
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

    void loadInterviewRemaining();

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
  }, [startPolling, clearAllPollingTimers, loadInterviewRemaining]);

  const progress = overview?.progress ?? EMPTY_PROGRESS;
  const isProfileReady = Object.values(progress).every(Boolean);

  const handleProfileEdit = () => {
    push(getProfileEditPath(progress));
  };

  const handleOpenResultSubmit = () => {
    setResultSubmitError(null);
    setIsResultSubmitOpen(true);
  };

  const handleSubmitResult = async () => {
    const sessionId = interviewRemaining?.pendingSubmissionSessionId;
    if (!sessionId || isResultSubmitting) return;

    if (submittedSessionIdsRef.current.has(sessionId)) {
      setIsResultSubmitting(true);
      setResultSubmitError(null);
      const didRefresh = await loadInterviewRemaining();
      if (didRefresh) {
        setIsResultSubmitOpen(false);
      } else {
        setResultSubmitError('제출 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.');
      }
      if (isMountedRef.current) setIsResultSubmitting(false);
      return;
    }

    submittedSessionIdsRef.current.add(sessionId);
    setIsResultSubmitting(true);
    setResultSubmitError(null);

    try {
      await requestInterviewAnalysis(sessionId);
      const didRefresh = await loadInterviewRemaining();
      if (!didRefresh) {
        setResultSubmitError('제출 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.');
        return;
      }
      setIsResultSubmitOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.apiStatus === 'INTERVIEW_ANALYSIS_ALREADY_REQUESTED') {
        const didRefresh = await loadInterviewRemaining();
        if (didRefresh) {
          setIsResultSubmitOpen(false);
          return;
        }
        setResultSubmitError('제출 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.');
        return;
      }

      submittedSessionIdsRef.current.delete(sessionId);
      setResultSubmitError('면접 결과 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (isMountedRef.current) setIsResultSubmitting(false);
    }
  };

  const isInterviewLocked =
    !isInterviewLoading &&
    !hasInterviewError &&
    interviewRemaining?.remainingCount === 0 &&
    interviewRemaining.pendingSubmissionSessionId === null;

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
            <InterviewCallout
              canStartInterview={isProfileReady}
              totalCount={interviewRemaining?.totalCount ?? null}
              remainingCount={interviewRemaining?.remainingCount ?? null}
              hasPendingSubmission={interviewRemaining?.pendingSubmissionSessionId !== null}
              isLocked={isInterviewLocked}
              isLoading={isInterviewLoading}
              hasError={hasInterviewError}
              onRetry={() => void loadInterviewRemaining()}
              onSubmitResult={handleOpenResultSubmit}
            />
          </div>

          {isInterviewLocked && (
            <ReapplyNotice
              reapplyDDay={interviewRemaining?.reapplyDDay ?? null}
              isLoading={isInterviewLoading}
              hasError={hasInterviewError}
              onRetry={() => void loadInterviewRemaining()}
            />
          )}
        </>
      )}
      <InterviewResultSubmitModal
        open={isResultSubmitOpen}
        isSubmitting={isResultSubmitting}
        errorMessage={resultSubmitError}
        canContinueInterview={(interviewRemaining?.remainingCount ?? 0) > 0}
        onClose={() => {
          if (isResultSubmitting) return;
          setIsResultSubmitOpen(false);
          setResultSubmitError(null);
        }}
        onSubmit={() => void handleSubmitResult()}
      />
    </div>
  );
}
