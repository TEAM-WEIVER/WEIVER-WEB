'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  buttonText: string;
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  buttonText,
  onConfirm,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="bg-primary-900/30 fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onConfirm();
      }}
    >
      <div className="border-border-light bg-bg-primary w-[386px] rounded-[20px] border p-6 shadow-[0px_8px_24px_0px_rgba(149,157,165,0.2)]">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-h3 text-text-secondary">{title}</h3>
            <p className="text-body2 text-text-tertiary whitespace-pre-line">{description}</p>
          </div>
          <Button type="button" size="sm" onClick={onConfirm}>
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
