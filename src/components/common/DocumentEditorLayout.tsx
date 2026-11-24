import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DocumentStatus } from '@/lib/document-progress';
import { cn } from '@/lib/utils';

const documents = [
  { id: 'resume', label: '이력서' },
  { id: 'cover-letter', label: '자기소개서' },
  { id: 'portfolio', label: '포트폴리오' },
] as const;

export type EditorDocument = (typeof documents)[number]['id'];

const documentStatuses = {
  notStarted: { label: '미작성', className: 'bg-transparent text-text-secondary' },
  inProgress: { label: '작성 중', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  complete: { label: '작성 완료', className: 'bg-primary-100 text-text-secondary' },
} satisfies Record<DocumentStatus, { label: string; className: string }>;

export type DocumentEditorLayoutProps = {
  activeDocument: EditorDocument;
  /** 생략하면 기존 공고별 서류 3종을 표시한다. */
  visibleDocuments?: readonly EditorDocument[];
  progress: number;
  isSaving?: boolean;
  onSaveDraft: () => void;
  children: ReactNode;
  footerActions?: ReactNode;
  onDocumentChange?: (document: EditorDocument) => void;
  statuses?: Partial<Record<EditorDocument, DocumentStatus>>;
};

export function DocumentEditorLayout({
  activeDocument,
  visibleDocuments,
  progress,
  isSaving = false,
  onSaveDraft,
  children,
  footerActions,
  onDocumentChange,
  statuses,
}: DocumentEditorLayoutProps) {
  const displayedDocuments = visibleDocuments
    ? documents.filter(({ id }) => visibleDocuments.includes(id))
    : documents;

  return (
    <div className="bg-bg-secondary min-h-dvh">
      <div className="mx-auto grid max-w-[1440px] items-start gap-6 px-4 pt-10 pb-20 sm:px-6 md:grid-cols-[minmax(0,216px)_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-15">
        <aside aria-label="서류 작성 현황" className="space-y-5">
          <nav aria-label="작성 필요 서류">
            <p className="text-body3 text-text-secondary mb-2">작성 필요 서류</p>
            <ul className="space-y-1">
              {displayedDocuments.map(({ id, label }) => {
                const isActive = id === activeDocument;
                const status =
                  statuses?.[id] ??
                  (isActive && progress > 0
                    ? progress === 100
                      ? 'complete'
                      : 'inProgress'
                    : 'notStarted');
                const { label: statusLabel, className: statusClassName } = documentStatuses[status];
                const rowClassName = cn(
                  'text-body2 text-text-secondary flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3',
                  isActive && 'bg-bg-tertiary text-text-primary',
                );
                const content = (
                  <>
                    {label}
                    <Badge className={cn('rounded-sm', statusClassName)}>{statusLabel}</Badge>
                  </>
                );

                return (
                  <li key={id}>
                    {isActive || !onDocumentChange ? (
                      <span aria-current={isActive ? 'page' : undefined} className={rowClassName}>
                        {content}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDocumentChange(id)}
                        className={cn(rowClassName, 'hover:bg-bg-tertiary focus-visible:outline-2')}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-border-light text-text-secondary space-y-2 rounded-lg border bg-white p-4">
            <div className="text-body2 flex items-center justify-between gap-2" aria-hidden="true">
              <span>작성 진행률</span>
              <span>{progress}%</span>
            </div>
            <progress
              aria-label="작성 진행률"
              value={progress}
              max={100}
              className="[&::-moz-progress-bar]:bg-primary-700 [&::-webkit-progress-bar]:bg-primary-200 [&::-webkit-progress-value]:bg-primary-700 block h-1.5 w-full overflow-hidden rounded-full"
            />
          </div>
        </aside>

        <main className="min-w-0">
          {children}
          <footer className="border-border-light mt-10 flex flex-wrap justify-end gap-3 border-t pt-5">
            <Button type="button" size="xs" disabled={isSaving} onClick={() => onSaveDraft()}>
              임시 저장
            </Button>
            {footerActions}
          </footer>
        </main>
      </div>
    </div>
  );
}
