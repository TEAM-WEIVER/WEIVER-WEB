import { Badge } from '@/components/ui/badge';

import { DocumentItemActions } from '../../_components/document-item-actions';
import {
  formatCharacterCount,
  isQuestionComplete,
  type CoverLetterQuestion,
} from '../_model/cover-letter';

export function QuestionCard({
  entry,
  editDisabled,
  onEdit,
  onDelete,
}: {
  entry: CoverLetterQuestion;
  editDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = entry.question.trim() ? entry.question : '제목 없는 문항';

  return (
    <article className="border-border-light bg-card space-y-3 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <Badge
            variant="outline"
            className="border-border-light bg-bg-secondary text-text-tertiary rounded-sm"
          >
            {isQuestionComplete(entry) ? '작성 완료' : '작성 중'}
          </Badge>
          <h2 className="text-h4 wrap-anywhere">{title}</h2>
        </div>
        <DocumentItemActions
          itemTitle={title}
          onEdit={onEdit}
          onDelete={onDelete}
          editDisabled={editDisabled}
        />
      </div>
      <p className="text-body3 border-border-light bg-bg-secondary text-text-secondary rounded-lg border p-4 wrap-anywhere whitespace-pre-wrap">
        {entry.answer}
      </p>
      <p className="text-caption text-text-tertiary text-right">
        {formatCharacterCount(entry.answer)}
      </p>
    </article>
  );
}
