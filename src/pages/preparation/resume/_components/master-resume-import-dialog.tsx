import { AlertDialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

type MasterResumeImportDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onReturnFocus: () => void;
};

export function MasterResumeImportDialog({
  open,
  onCancel,
  onConfirm,
  onReturnFocus,
}: MasterResumeImportDialogProps) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content
          className="border-border-light bg-bg-primary fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border p-6 shadow-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onReturnFocus();
          }}
        >
          <AlertDialog.Title className="text-h3 text-text-primary">
            마스터본으로 불러올까요?
          </AlertDialog.Title>
          <AlertDialog.Description className="text-body2 text-text-secondary mt-3">
            현재 이 공고에서 작성한 내용을 마스터본으로 바꿔요. 저장하기 전까지 기존 저장본은
            유지돼요.
          </AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline">
                취소
              </Button>
            </AlertDialog.Cancel>
            <Button type="button" onClick={onConfirm}>
              불러오기
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
