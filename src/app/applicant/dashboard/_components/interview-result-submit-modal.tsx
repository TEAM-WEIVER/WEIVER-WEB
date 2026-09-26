'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

interface InterviewResultSubmitModalProps {
  open: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  canContinueInterview: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function InterviewResultSubmitModal({
  open,
  isSubmitting,
  errorMessage,
  canContinueInterview,
  onClose,
  onSubmit,
}: InterviewResultSubmitModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/30 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="interview-result-submit-title"
        aria-describedby="interview-result-submit-description"
        className="w-full max-w-[386px] rounded-[20px] border border-slate-200 bg-[#fcfcfc] p-6 shadow-[0_8px_12px_rgba(149,157,165,0.2)]"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h2
            id="interview-result-submit-title"
            className="text-xl leading-7 font-semibold text-slate-700"
          >
            면접 결과를 제출하시겠습니까?
          </h2>
          <p id="interview-result-submit-description" className="text-sm leading-5 text-slate-500">
            제출한 뒤에는 다시 면접을 볼 수 없습니다.
          </p>
          <p className="sr-only">제출 후 31일 동안 면접 진행과 결과 제출이 불가능합니다.</p>
        </div>
        {errorMessage && (
          <p role="alert" className="mt-4 text-sm text-red-500">
            {errorMessage}
          </p>
        )}
        <div className="mt-6 flex gap-3.5">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="h-[43px] flex-1 rounded-[10px] border-slate-300 bg-[#fcfcfc] text-slate-900"
          >
            {canContinueInterview ? '계속 면접 보기' : '취소'}
          </Button>
          <Button
            type="button"
            isLoading={isSubmitting}
            onClick={onSubmit}
            className="h-[43px] flex-1 rounded-[10px] bg-slate-700 text-white hover:bg-slate-800"
          >
            {errorMessage ? '다시 시도' : '제출'}
          </Button>
        </div>
      </section>
    </div>
  );
}
