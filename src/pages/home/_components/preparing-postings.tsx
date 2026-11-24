import { ChevronRight, Plus } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { HomePostings, HomeSectionState } from '../_types/home';
import { HomeJobPostingCard } from './home-job-posting-card';
import { HomeSectionFeedback } from './home-section-feedback';

type PreparingPostingsProps = {
  state: HomeSectionState<HomePostings>;
  onViewAll?: () => void;
  onContinue?: (id: string) => void;
  onRegister?: () => void;
  onRetry?: () => void;
};

export function PreparingPostings({
  state,
  onViewAll,
  onContinue,
  onRegister,
  onRetry,
}: PreparingPostingsProps) {
  return (
    <section aria-label="준비 중인 지원 공고">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionHeading as="h2" title="준비 중인 지원 공고" />
        <Button
          type="button"
          variant="ghost"
          className="h-8 gap-1 px-0 text-xs font-normal"
          onClick={onViewAll}
          disabled={!onViewAll}
          title={!onViewAll ? '준비 중' : undefined}
        >
          전체 보기
          {state.status === 'ready' ? ` (${state.data.total.toLocaleString('ko-KR')})` : ''}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {state.status === 'ready' ? (
        state.data.postings.length ? (
          <ul aria-label="준비 중인 공고 목록" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {state.data.postings.map((posting) => (
              <li key={posting.id} className="min-w-0">
                <HomeJobPostingCard posting={posting} onContinue={onContinue} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border-light flex min-h-60 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-white px-6 py-10 text-center">
            <p className="text-body2 text-text-tertiary">
              아직 준비 중인 지원 공고가 없어요.
              <br />
              관심 있는 공고를 등록하고 면접 준비를 시작해보세요.
            </p>
            <Button
              type="button"
              className="h-10 text-sm"
              onClick={onRegister}
              disabled={!onRegister}
              title={!onRegister ? '준비 중' : undefined}
            >
              <Plus aria-hidden="true" />
              공고 등록
            </Button>
          </div>
        )
      ) : state.status === 'loading' ? (
        <div
          role="status"
          aria-label="준비 중인 공고 불러오는 중"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="border-border-light flex min-h-60 rounded-xl border bg-white p-6">
          <HomeSectionFeedback status={state.status} label="지원 공고" onRetry={onRetry} />
        </div>
      )}
    </section>
  );
}
