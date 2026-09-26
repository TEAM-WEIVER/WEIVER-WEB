'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface InterviewErrorReportModalProps {
  open: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (content: string) => Promise<boolean>;
}

export function InterviewErrorReportModal({
  open,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: InterviewErrorReportModalProps) {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      textareaRef.current?.focus();
      return;
    }

    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setContent('');
    setValidationError(null);
    onClose();
  }

  async function handleSubmit() {
    const normalizedContent = content.trim();
    if (normalizedContent.length < 1 || normalizedContent.length > 500) {
      setValidationError('오류 내용을 1자 이상 500자 이하로 입력해 주세요.');
      return;
    }

    setValidationError(null);
    const submitted = await onSubmit(normalizedContent);
    if (submitted) handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/30 p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-report-title"
        aria-describedby="error-report-description"
        className="w-full max-w-[592px] rounded-[20px] border border-slate-200 bg-[#fcfcfc] p-6 shadow-[0_8px_12px_rgba(149,157,165,0.2)]"
      >
        <div className="flex flex-col gap-2">
          <h2 id="error-report-title" className="text-xl leading-7 font-semibold text-slate-700">
            어떤 오류가 발생했는지 자세히 적어주세요.
          </h2>
          <p id="error-report-description" className="text-sm leading-5 font-medium text-slate-500">
            보내주신 오류 리포트는 빠르게 확인 후, 조치해드리겠습니다.
          </p>
        </div>
        <div className="mt-6">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="오류 내용을 입력해 주세요."
            maxLength={500}
            aria-invalid={Boolean(validationError || submitError)}
            aria-describedby={validationError || submitError ? 'error-report-message' : undefined}
            className="min-h-[88px] resize-none rounded-lg border-slate-200 bg-slate-50"
          />
          {(validationError || submitError) && (
            <p id="error-report-message" role="alert" className="mt-2 text-sm text-red-500">
              {validationError ?? submitError}
            </p>
          )}
        </div>
        <div className="mt-6 flex gap-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-[43px] flex-1 rounded-[10px] border-slate-300 bg-[#fcfcfc] text-slate-900"
          >
            취소
          </Button>
          <Button
            type="button"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            className="h-[43px] flex-1 rounded-[10px] bg-slate-700 text-white hover:bg-slate-800"
          >
            오류 리포트 보내기
          </Button>
        </div>
      </section>
    </div>
  );
}
