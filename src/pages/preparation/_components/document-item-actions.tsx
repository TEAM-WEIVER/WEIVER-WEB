import { Button } from '@/components/ui/button';

type DocumentItemActionsProps = {
  itemTitle: string;
  onEdit: () => void;
  onDelete: () => void;
  editDisabled?: boolean;
};

export function DocumentItemActions({
  itemTitle,
  onEdit,
  onDelete,
  editDisabled,
}: DocumentItemActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className="text-body3 text-text-tertiary h-8 px-2"
        aria-label={`${itemTitle} 수정`}
        disabled={editDisabled}
        onClick={onEdit}
      >
        수정
      </Button>
      <span aria-hidden="true" className="bg-border-default h-3 w-px" />
      <Button
        type="button"
        variant="ghost"
        className="text-body3 text-error hover:text-error h-8 px-2"
        aria-label={`${itemTitle} 삭제`}
        onClick={onDelete}
      >
        삭제
      </Button>
    </div>
  );
}
