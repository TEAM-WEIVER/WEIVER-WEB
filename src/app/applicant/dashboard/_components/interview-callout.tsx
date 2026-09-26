import Link from 'next/link';

import { Button } from '@/components/ui/button';

type InterviewCalloutProps = {
  canStartInterview: boolean;
  remainingCount: number | null;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
};

export function InterviewCallout({
  canStartInterview,
  remainingCount,
  isLoading,
  hasError,
  onRetry,
}: InterviewCalloutProps) {
  const buttonClassName =
    'h-[42px] w-full rounded-[10px] shadow-none disabled:bg-primary-200 disabled:text-text-disabled';

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
        ) : canStartInterview && remainingCount !== null && remainingCount > 0 ? (
          <Button
            type="button"
            size="sm"
            className={`bg-success text-text-primary hover:bg-success/90 ${buttonClassName}`}
            asChild
          >
            <Link href="/applicant/interview">AI 면접 진행하기</Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className={buttonClassName}
            disabled={
              isLoading || !canStartInterview || remainingCount === null || remainingCount <= 0
            }
          >
            {isLoading ? '면접 상태 확인 중...' : 'AI 면접 진행하기'}
          </Button>
        )}
      </div>
    </section>
  );
}
