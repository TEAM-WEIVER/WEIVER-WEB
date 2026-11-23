import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { HomeJobPosting } from '../_types/home';

type HomeJobPostingCardProps = {
  posting: HomeJobPosting;
  onContinue?: (id: string) => void;
};

export function HomeJobPostingCard({ posting, onContinue }: HomeJobPostingCardProps) {
  const completed = posting.documents.filter((document) => document.status === 'complete').length;

  return (
    <article
      aria-label={`${posting.companyName} ${posting.positionName}`}
      className="border-border-light flex h-full min-w-0 flex-col rounded-xl border bg-white p-5"
    >
      {posting.recruitmentLabel ? (
        <Badge className="bg-bg-tertiary text-text-secondary mb-3 self-start rounded-sm px-2 py-0.5">
          {posting.recruitmentLabel}
        </Badge>
      ) : null}
      <p className="text-body3 text-text-secondary wrap-anywhere">{posting.companyName}</p>
      <h3 className="text-h4 text-text-primary mt-1 mb-4 wrap-anywhere">{posting.positionName}</h3>
      <dl className="bg-bg-tertiary text-body2 text-text-secondary mt-auto space-y-2 rounded-lg p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt>지원서류</dt>
          <dd>
            {posting.documents.length
              ? `${completed}/${posting.documents.length} 준비 완료`
              : '등록된 서류 없음'}
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <dt>AI 모의면접</dt>
          <dd>{posting.interviewCount.toLocaleString('ko-KR')}회 진행</dd>
        </div>
      </dl>
      <Button
        type="button"
        className="mt-4 h-9 w-full gap-2 text-sm"
        onClick={() => onContinue?.(posting.id)}
        disabled={!onContinue}
        title={!onContinue ? '준비 중' : undefined}
        aria-label={`${posting.companyName} ${posting.positionName} 이어서 준비하기`}
      >
        이어서 준비하기 <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </article>
  );
}
