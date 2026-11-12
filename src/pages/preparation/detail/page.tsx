import { BackButton } from '@/components/common/back-button';
import { SectionHeading } from '@/components/common/section-heading';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ApplicationDocumentsSummary } from '../_components/application-documents-summary';
import { DeleteJobPostingDialog } from '../_components/delete-job-posting-dialog';
import { InterviewSummary } from '../_components/interview-summary';
import { JobPostingContent } from '../_components/job-posting-content';
import { JobPostingSidebar } from '../_components/job-posting-sidebar';
import type {
  ApplicationDocument,
  InterviewRecord,
  JobPostingDetail,
  JobPostingSummary,
} from '../_types/job-posting-detail';

export type PostingDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | {
      status: 'ready';
      posting: JobPostingDetail;
      documents: ApplicationDocument[];
      interviews: InterviewRecord[];
      canStartInterview: boolean;
      interviewUnavailableReason?: string;
    };

type PreparationDetailPageProps = {
  postings: JobPostingSummary[];
  selectedId: string;
  detail: PostingDetailState;
  onBack: () => void;
  onSelectPosting: (id: string) => void;
  onRetry?: () => void;
  onEdit?: (id: string) => void;
  /** 삭제 후 목록 갱신/이동은 소비 페이지가 담당한다. 실패 시 reject한다. */
  onDelete?: (id: string) => Promise<void>;
  onOpenDocument?: (postingId: string, kind: ApplicationDocument['kind']) => void;
  onStartInterview?: (postingId: string) => void;
  onOpenReport?: (interviewId: string) => void;
};

export default function PreparationDetailPage({
  postings,
  selectedId,
  detail,
  onBack,
  onSelectPosting,
  onRetry,
  onEdit,
  onDelete,
  onOpenDocument,
  onStartInterview,
  onOpenReport,
}: PreparationDetailPageProps) {
  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:px-15">
      <aside className="min-w-0">
        <JobPostingSidebar postings={postings} selectedId={selectedId} onSelect={onSelectPosting} />
      </aside>
      <main className="min-w-0">
        <BackButton onClick={onBack} className="-mt-2 mb-4">
          지원 공고 목록
        </BackButton>
        {detail.status === 'loading' ? (
          <div role="status" aria-label="공고 불러오는 중" className="space-y-6">
            <h1 className="sr-only">공고 상세</h1>
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : detail.status === 'error' ? (
          <div className="space-y-4 py-10">
            <SectionHeading
              as="h1"
              title="공고를 불러오지 못했어요."
              description="잠시 후 다시 시도해주세요."
            />
            <Button type="button" onClick={onRetry} disabled={!onRetry} className="text-sm">
              다시 시도
            </Button>
          </div>
        ) : detail.status === 'notFound' ? (
          <div className="py-10">
            <SectionHeading
              as="h1"
              title="공고를 찾을 수 없어요."
              description="삭제되었거나 접근할 수 없는 공고예요. 목록에서 다른 공고를 선택해주세요."
            />
          </div>
        ) : (
          <>
            <div className="border-border-light mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-body3 text-text-tertiary mb-1 wrap-anywhere">
                  {detail.posting.companyName}
                </p>
                <SectionHeading as="h1" title={detail.posting.positionName} />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!onEdit}
                  onClick={() => onEdit?.(detail.posting.id)}
                  title={!onEdit ? '준비 중' : undefined}
                  className="h-9 px-3 text-xs font-normal"
                >
                  수정
                </Button>
                <DeleteJobPostingDialog
                  key={detail.posting.id}
                  postingName={`${detail.posting.companyName} ${detail.posting.positionName}`}
                  onDelete={onDelete ? () => onDelete(detail.posting.id) : undefined}
                />
              </div>
            </div>
            <div className="space-y-6">
              <JobPostingContent
                content={detail.posting.content}
                sourceUrl={detail.posting.sourceUrl}
              />
              <ApplicationDocumentsSummary
                documents={detail.documents}
                onOpenDocument={
                  onOpenDocument ? (kind) => onOpenDocument(detail.posting.id, kind) : undefined
                }
              />
              <InterviewSummary
                interviews={detail.interviews}
                canStart={detail.canStartInterview}
                unavailableReason={detail.interviewUnavailableReason}
                onStart={onStartInterview ? () => onStartInterview(detail.posting.id) : undefined}
                onOpenReport={onOpenReport}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
