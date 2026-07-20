'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';

type ActionConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string | readonly string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'confirm' | 'alert';
  onConfirm: () => void;
  onCancel?: () => void;
};

function DialogDescription({ description }: { description: string | readonly string[] }) {
  const lines = Array.isArray(description) ? description : [description];

  return (
    <div className="text-body2 text-text-tertiary w-full text-center">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function ActionConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'confirm',
  onConfirm,
  onCancel,
}: ActionConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isAlert = variant === 'alert';

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="bg-primary-900/30 fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onCancel?.();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-confirm-dialog-title"
        className="border-border-light bg-bg-primary w-full max-w-[386px] rounded-[20px] border p-6 shadow-[0_8px_24px_rgba(149,157,165,0.2)]"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full flex-col items-center gap-2 text-center">
            <h2 id="action-confirm-dialog-title" className="text-h3 text-text-secondary">
              {title}
            </h2>
            <DialogDescription description={description} />
          </div>

          {isAlert ? (
            <Button type="button" size="sm" className="rounded-[10px]" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : (
            <div className="grid w-full grid-cols-2 gap-3.5">
              <Button
                type="button"
                variant="outline"
                className="border-border-default bg-bg-primary text-text-primary hover:bg-bg-tertiary h-[43px] rounded-[10px] shadow-none"
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
              <Button type="button" className="h-[43px] rounded-[10px]" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
