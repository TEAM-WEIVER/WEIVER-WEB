import { ChevronRight } from 'lucide-react';

import type { JobPostingSummary } from '../_types/job-posting-detail';

type JobPostingCardProps = {
  posting: JobPostingSummary;
  onSelect: (id: string) => void;
};

export function JobPostingCard({ posting, onSelect }: JobPostingCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(posting.id)}
      aria-label={`${posting.companyName} ${posting.positionName} 상세 보기`}
      className="border-border-light hover:border-border-default hover:bg-bg-secondary focus-visible:ring-ring flex min-h-23 w-full items-center justify-between gap-4 rounded-xl border bg-white p-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <span className="min-w-0 space-y-2">
        <span className="text-caption text-text-tertiary block wrap-anywhere">
          {posting.companyName}
        </span>
        <span className="text-body1 text-text-primary block wrap-anywhere">
          {posting.positionName}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="text-text-secondary size-5 shrink-0" />
    </button>
  );
}
