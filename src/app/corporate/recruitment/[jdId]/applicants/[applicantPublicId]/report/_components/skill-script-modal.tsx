'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

type HighlightTone = 'success' | 'warning';

export type ScriptTextSegment = {
  text: string;
  tone?: HighlightTone;
};

export type SkillScriptItem = {
  id: string;
  question: string;
  tags: {
    label: string;
    tone?: HighlightTone;
  }[];
  answer: ScriptTextSegment[];
};

type SkillScriptModalProps = {
  open: boolean;
  competencyName: string;
  scripts: SkillScriptItem[];
  onClose: () => void;
};

function HighlightTag({ label, tone = 'success' }: { label: string; tone?: HighlightTone }) {
  return (
    <span
      className={cn(
        'text-body2 text-text-primary inline-flex h-7 items-center rounded-md border px-1.5',
        tone === 'success' ? 'border-success bg-success/10' : 'border-warning bg-warning/10',
      )}
    >
      {label}
    </span>
  );
}

function ScriptAnswer({ segments }: { segments: ScriptTextSegment[] }) {
  return (
    <p className="text-body2 text-text-primary leading-6">
      {segments.map((segment, index) => {
        if (!segment.tone) {
          return <span key={`${segment.text}-${index}`}>{segment.text}</span>;
        }

        return (
          <mark
            key={`${segment.text}-${index}`}
            className={cn(
              'bg-transparent font-semibold underline underline-offset-2',
              segment.tone === 'success' ? 'text-success' : 'text-warning',
            )}
          >
            {segment.text}
          </mark>
        );
      })}
    </p>
  );
}

export function SkillScriptModal({
  open,
  competencyName,
  scripts,
  onClose,
}: SkillScriptModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="bg-primary-900/30 fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-script-title"
        className="border-border-light bg-bg-primary flex max-h-[calc(100vh-64px)] w-full max-w-[797px] flex-col gap-6 overflow-hidden rounded-[20px] border p-5 shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
      >
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="skill-script-title" className="text-h3 text-text-primary">
              {competencyName} 스크립트
            </h2>
            <p className="text-body2 text-text-tertiary">
              {competencyName} 결과에 영향을 준 AI 면접 스크립트예요.
            </p>
          </div>
          <button
            type="button"
            aria-label="스크립트 모달 닫기"
            className="text-primary-600 hover:bg-bg-tertiary flex size-8 shrink-0 items-center justify-center rounded-md"
            onClick={onClose}
          >
            <X className="size-6" />
          </button>
        </header>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {scripts.map((script) => (
            <article key={script.id} className="flex flex-col gap-3">
              <div className="border-border-light bg-bg-tertiary rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-xl border px-5 py-3.5">
                <div className="flex flex-col gap-2.5">
                  <p className="text-body2 text-text-primary">{script.question}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {script.tags.map((tag) => (
                      <HighlightTag key={tag.label} label={tag.label} tone={tag.tone} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-primary-700 bg-bg-secondary border-l-4 px-5 py-3.5">
                <ScriptAnswer segments={script.answer} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
