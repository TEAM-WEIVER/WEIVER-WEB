import { ChevronRight, CircleDollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { HomePoints, HomeSectionState } from '../_types/home';
import { HomeSectionFeedback } from './home-section-feedback';

type PointsSummaryProps = {
  state: HomeSectionState<HomePoints>;
  onOpenHistory?: () => void;
  onCharge?: () => void;
  onRetry?: () => void;
};

export function HeaderPoints({ state }: Pick<PointsSummaryProps, 'state'>) {
  if (state.status === 'loading') {
    return <Skeleton aria-hidden="true" className="h-7 w-20 rounded-full" />;
  }

  const label =
    state.status === 'ready'
      ? `${state.data.balance.toLocaleString('ko-KR')}P`
      : state.status === 'error'
        ? '포인트 확인 불가'
        : '포인트 준비 중';

  return (
    <span
      aria-label={state.status === 'ready' ? `보유 포인트 ${label}` : label}
      className="bg-bg-tertiary text-text-secondary text-caption inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
    >
      <CircleDollarSign aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

export function PointsSummary({ state, onOpenHistory, onCharge, onRetry }: PointsSummaryProps) {
  return (
    <section
      aria-label="내 포인트"
      className="border-border-light flex min-w-0 flex-col rounded-xl border bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body2 text-text-secondary flex items-center gap-2">
          <CircleDollarSign aria-hidden="true" className="size-4" />내 포인트
        </h2>
        <Button
          type="button"
          variant="ghost"
          className="h-7 gap-0.5 px-0 text-xs font-normal"
          disabled={!onOpenHistory}
          onClick={onOpenHistory}
          title={!onOpenHistory ? '준비 중' : undefined}
        >
          포인트 내역 보기 <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
      {state.status === 'ready' ? (
        <div className="mt-3 mb-8">
          <p className="text-text-secondary text-[32px] leading-10 font-bold tracking-tight">
            {state.data.balance.toLocaleString('ko-KR')}P
          </p>
          <p className="text-body3 text-text-tertiary mt-2">
            AI 모의면접에 사용할 수 있는 보유 포인트입니다.
            {state.data.interviewCost !== undefined ? (
              <span className="block">
                (1회당 {state.data.interviewCost.toLocaleString('ko-KR')}P 소진)
              </span>
            ) : null}
          </p>
        </div>
      ) : state.status === 'loading' ? (
        <div role="status" aria-label="포인트 불러오는 중" className="mt-4 mb-8 space-y-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <HomeSectionFeedback status={state.status} label="포인트" onRetry={onRetry} />
      )}
      <Button
        type="button"
        className="mt-auto h-11 w-full text-sm"
        onClick={onCharge}
        disabled={!onCharge}
        title={!onCharge ? '준비 중' : undefined}
      >
        포인트 충전하기
      </Button>
    </section>
  );
}
