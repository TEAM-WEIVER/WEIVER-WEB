import { CloudUpload, FilePenLine, FileText } from 'lucide-react';

import { SectionHeading } from '@/components/common/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { ApplicationDocument } from '../_types/job-posting-detail';

const documentKinds = {
  resume: { label: '이력서', icon: FileText },
  coverLetter: { label: '자기소개서', icon: FilePenLine },
  portfolio: { label: '포트폴리오', icon: CloudUpload },
};
const statuses = {
  notStarted: { label: '미작성', className: 'bg-bg-tertiary text-text-secondary' },
  inProgress: { label: '작성 중', className: 'bg-amber-50 text-amber-800' },
  complete: { label: '작성 완료', className: 'bg-bg-tertiary text-text-secondary' },
};

type ApplicationDocumentsSummaryProps = {
  documents: ApplicationDocument[];
  onOpenDocument?: (kind: ApplicationDocument['kind']) => void;
};

export function ApplicationDocumentsSummary({
  documents,
  onOpenDocument,
}: ApplicationDocumentsSummaryProps) {
  return (
    <section aria-label="지원서류 준비 현황">
      <div className="border-border-light mb-4 border-b pb-4">
        <SectionHeading
          as="h2"
          size="sm"
          title="지원서류 준비 현황"
          description="이 공고에 사용할 지원서류를 확인하고 관리해보세요."
        />
      </div>
      <ul className="border-border-light divide-border-light divide-y rounded-xl border bg-white px-4">
        {documents.map(({ kind, status, required }) => {
          const { label, icon: Icon } = documentKinds[kind];
          const state = statuses[status];
          const action = status === 'notStarted' ? '작성하기' : '수정하기';
          return (
            <li key={kind} className="flex flex-wrap items-center gap-2 py-3">
              <span className="bg-bg-tertiary text-text-secondary rounded-lg p-2">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="text-body3 text-text-secondary min-w-16 flex-1">
                {label}
                {required ? <span aria-label="필수"> *</span> : null}
              </span>
              <Badge className={state.className}>{state.label}</Badge>
              <Button
                type="button"
                variant="outline"
                disabled={!onOpenDocument}
                onClick={() => onOpenDocument?.(kind)}
                aria-label={`${label} ${action}`}
                title={!onOpenDocument ? '준비 중' : undefined}
                className="h-8 px-2 text-xs font-normal"
              >
                {action}
              </Button>
            </li>
          );
        })}
      </ul>
      {documents.length === 0 ? (
        <p className="text-body3 text-text-tertiary py-4">지원서류 정보가 없어요.</p>
      ) : null}
    </section>
  );
}
