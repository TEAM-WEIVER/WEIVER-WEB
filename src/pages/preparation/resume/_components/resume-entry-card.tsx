import { Button } from '@/components/ui/button';

import type { EntrySummary } from '../_model/resume-types';

type ResumeEntryCardProps = {
  summary: EntrySummary;
  onEdit: () => void;
  onDelete: () => void;
};

export function ResumeEntryCard({ summary, onEdit, onDelete }: ResumeEntryCardProps) {
  return (
    <article className="border-border-default flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <div className="min-w-0 flex-1 space-y-1 wrap-anywhere">
        <h3 className="text-body1 font-semibold">{summary.title}</h3>
        {summary.details.map((detail, index) => (
          <p key={index} className="text-body3 text-text-secondary">
            {detail}
          </p>
        ))}
        {summary.description ? (
          <p className="text-body3 text-text-secondary pt-1 whitespace-pre-wrap">
            {summary.description}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 bg-white"
          aria-label={`${summary.title} 수정`}
          onClick={onEdit}
        >
          수정
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-text-secondary h-9"
          aria-label={`${summary.title} 삭제`}
          onClick={onDelete}
        >
          삭제
        </Button>
      </div>
    </article>
  );
}
