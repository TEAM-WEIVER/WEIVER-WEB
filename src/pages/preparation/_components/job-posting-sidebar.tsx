import { cn } from '@/lib/utils';

import type { JobPostingSummary } from '../_types/job-posting-detail';

type JobPostingSidebarProps = {
  postings: JobPostingSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function JobPostingSidebar({ postings, selectedId, onSelect }: JobPostingSidebarProps) {
  return (
    <nav aria-label="지원 공고 빠르게 보기" className="min-w-0">
      <h2 className="text-body3 text-text-tertiary mb-3">지원 공고 목록 빠르게 보기</h2>
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {postings.map((posting) => (
          <li key={posting.id} className="w-48 shrink-0 lg:w-full">
            <button
              type="button"
              aria-current={selectedId === posting.id ? 'true' : undefined}
              onClick={() => onSelect(posting.id)}
              className={cn(
                'hover:bg-bg-secondary focus-visible:ring-ring w-full rounded-lg px-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset',
                selectedId === posting.id && 'bg-bg-tertiary',
              )}
            >
              <span className="text-caption text-text-secondary block wrap-anywhere">
                {posting.companyName}
              </span>
              <span className="text-body2 text-text-primary mt-1 block wrap-anywhere">
                {posting.positionName}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {postings.length === 0 ? (
        <p className="text-body3 text-text-tertiary">등록된 공고가 없어요.</p>
      ) : null}
    </nav>
  );
}
