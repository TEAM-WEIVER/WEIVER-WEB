import { FileText } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { HomeSectionState, ResumeSummary } from '../_types/home';
import { HomeSectionFeedback } from './home-section-feedback';

const resumeStatuses = {
  notStarted: { label: '미작성', className: 'bg-bg-tertiary text-text-secondary' },
  inProgress: { label: '작성 중', className: 'bg-amber-50 text-amber-800' },
  complete: { label: '작성 완료', className: 'bg-bg-tertiary text-text-secondary' },
};

type MasterResumeSummaryProps = {
  state: HomeSectionState<ResumeSummary>;
  onEdit?: () => void;
  onRetry?: () => void;
};

export function MasterResumeSummary({ state, onEdit, onRetry }: MasterResumeSummaryProps) {
  const resume = state.status === 'ready' ? state.data : undefined;
  const action = resume?.status === 'notStarted' ? '작성하기' : '수정하기';
  const badge = resume ? resumeStatuses[resume.status] : undefined;

  return (
    <section aria-label="공통 이력서" className="flex min-w-0 flex-col rounded-xl bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <SectionHeading as="h2" size="sm" title="공통 이력서" />
        <p className="text-caption text-text-tertiary">공고에 활용할 기본 이력서를 관리해보세요.</p>
      </div>
      {state.status === 'loading' ? (
        <div role="status" aria-label="이력서 불러오는 중" className="mt-8 flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="ml-auto h-8 w-36" />
        </div>
      ) : resume && badge ? (
        <div className="mt-8 flex flex-wrap items-center gap-3 px-1 sm:px-4">
          <span className="bg-bg-tertiary text-text-secondary rounded-lg p-2.5">
            <FileText aria-hidden="true" className="size-4.5" />
          </span>
          <span className="text-body2 text-text-secondary min-w-16 flex-1">
            이력서{resume.required ? <span aria-label="필수"> *</span> : null}
          </span>
          <Badge className={badge.className}>{badge.label}</Badge>
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3 text-xs font-normal"
            onClick={onEdit}
            disabled={!onEdit}
            title={!onEdit ? '준비 중' : undefined}
            aria-label={`이력서 ${action}`}
          >
            {action}
          </Button>
        </div>
      ) : state.status === 'error' || state.status === 'unavailable' ? (
        <HomeSectionFeedback status={state.status} label="이력서 관리" onRetry={onRetry} />
      ) : null}
    </section>
  );
}
