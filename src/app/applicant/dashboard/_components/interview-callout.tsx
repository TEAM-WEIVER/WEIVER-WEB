import Link from 'next/link';

import { Button } from '@/components/ui/button';

type InterviewCalloutProps = {
  canStartInterview: boolean;
  totalCount: number | null;
  remainingCount: number | null;
  hasPendingSubmission: boolean;
  isLocked: boolean;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onSubmitResult: () => void;
};

export function InterviewCallout({
  canStartInterview,
  totalCount,
  remainingCount,
  hasPendingSubmission,
  isLocked,
  isLoading,
  hasError,
  onRetry,
  onSubmitResult,
}: InterviewCalloutProps) {
  const buttonClassName =
    'h-[42px] w-full rounded-[10px] shadow-none disabled:bg-primary-200 disabled:text-text-disabled';
  const completedCount =
    totalCount !== null && remainingCount !== null
      ? Math.max(totalCount - remainingCount, 0)
      : null;
  const interviewButtonLabel =
    completedCount !== null && totalCount !== null
      ? `AI 면접 진행하기 (${completedCount}/${totalCount})`
      : 'AI 면접 진행하기';
  const canStart = canStartInterview && !isLocked && remainingCount !== null && remainingCount > 0;
  const canSubmitResult = !isLocked && hasPendingSubmission;

  return (
    <section className="bg-primary-700 shadow-primary-400/20 flex flex-col justify-end rounded-[20px] p-5 shadow-[0_8px_24px_rgba(149,157,165,0.2)] lg:min-h-[194px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-h3 text-text-inverse">AI 면접을 진행할 준비가 되셨나요?</h2>
          <p className="text-body2 text-primary-200">
            면접은 1차 기술면접, 2차 인적성면접으로 진행되며 약 1시간 정도 소요됩니다.
          </p>
          {!isLoading && remainingCount !== null && (
            <p className="text-primary-100 text-sm font-semibold">
              남은 면접 횟수 {remainingCount}회
            </p>
          )}
        </div>
        {hasError ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRetry}
            className={buttonClassName}
          >
            면접 상태 다시 불러오기
          </Button>
        ) : (
          <div className="flex gap-3">
            {canStart ? (
              <Button
                type="button"
                size="sm"
                className="bg-success text-text-primary hover:bg-success/90 h-[42px] w-full min-w-0 flex-1"
                asChild
              >
                <Link href="/applicant/interview">{interviewButtonLabel}</Link>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-[42px] w-full min-w-0 flex-1"
                disabled
                aria-describedby={isLocked ? 'interview-lock-description' : undefined}
              >
                {isLoading ? '면접 상태 확인 중...' : interviewButtonLabel}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[42px] w-full min-w-0 flex-1 bg-slate-50 text-slate-900"
              disabled={!canSubmitResult || isLoading}
              onClick={onSubmitResult}
              aria-describedby={isLocked ? 'interview-lock-description' : undefined}
            >
              면접 결과 제출하기
            </Button>
          </div>
        )}
        {isLocked && (
          <p id="interview-lock-description" className="sr-only">
            최종 제출 후 재지원 가능일까지 면접 진행과 결과 제출을 할 수 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
