import { useRef, useState } from 'react';
import { AlertDialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

type DeleteJobPostingDialogProps = {
  postingName: string;
  onDelete?: () => Promise<void>;
};

export function DeleteJobPostingDialog({ postingName, onDelete }: DeleteJobPostingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function handleDelete() {
    if (!onDelete || pending.current) return;
    pending.current = true;
    setIsDeleting(true);
    setError('');
    try {
      await onDelete();
      setOpen(false);
    } catch {
      setError('공고를 삭제하지 못했어요. 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (pending.current) return;
        setError('');
        setOpen(next);
      }}
    >
      <AlertDialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!onDelete}
          title={!onDelete ? '준비 중' : undefined}
          className="text-error h-9 px-3 text-xs font-normal"
        >
          삭제
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content
          aria-busy={isDeleting}
          className="border-border-light bg-bg-primary fixed top-1/2 left-1/2 z-50 w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-lg"
        >
          <AlertDialog.Title className="text-h3 text-text-primary">
            공고를 삭제할까요?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-body2 text-text-tertiary mt-3 wrap-anywhere">
            {postingName} 공고를 삭제합니다.
          </AlertDialog.Description>
          {error ? (
            <p role="alert" className="text-body2 text-error mt-4">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" disabled={isDeleting} className="text-sm">
                취소
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="destructive"
              isLoading={isDeleting}
              onClick={handleDelete}
              className="text-sm"
            >
              공고 삭제
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
