import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';

import { BackButton } from '@/components/common/back-button';
import type { EditorDocument } from '@/components/common/DocumentEditorLayout';
import {
  PREPARATION_PATH,
  masterResumePath,
  postingDocumentPath,
  postingPath,
} from '@/lib/preparation-paths';
import { usePreparationStore } from '@/store/preparation-store';
import { toast } from '@/store/toast-store';

import { getPostingDocuments } from '@/lib/preparation-documents';
import { CoverLetterEditor } from './cover-letter/cover-letter-editor';
import PreparationDetailPage from './detail/page';
import PreparationEditPage from './edit/page';
import PreparationListPage from './list/page';
import PreparationNewPage from './new/page';
import { PortfolioEditor } from './portfolio/portfolio-editor';
import { hasMasterResume } from './resume/_model/master-resume';
import type { ResumeDraft } from './resume/_model/resume-sections';
import ResumeEditor from './resume/page';

const documentId = {
  resume: 'resume',
  coverLetter: 'cover-letter',
  portfolio: 'portfolio',
} as const;

function draftSaved() {
  toast.add({ type: 'success', title: '임시 저장했어요.' });
}

function usePostingDocuments(postingId: string) {
  const resumes = usePreparationStore((state) => state.resumes);
  const coverLetters = usePreparationStore((state) => state.coverLetters);
  const portfolios = usePreparationStore((state) => state.portfolios);
  return getPostingDocuments({ resumes, coverLetters, portfolios }, postingId);
}

function MissingPosting() {
  return (
    <main className="mx-auto max-w-[1440px] space-y-4 px-6 py-10">
      <h1 className="text-h2">공고를 찾을 수 없어요.</h1>
      <p className="text-body2 text-text-secondary">삭제되었거나 접근할 수 없는 공고예요.</p>
      <Link to={PREPARATION_PATH} className="underline">
        지원 공고 목록으로 돌아가기
      </Link>
    </main>
  );
}

export function PreparationListRoute() {
  const navigate = useNavigate();
  const postings = usePreparationStore((state) => state.postings);
  return (
    <PreparationListPage
      state={{ status: 'ready', postings }}
      onRegister={() => navigate(`${PREPARATION_PATH}/new`)}
      onSelectPosting={(id) => navigate(postingPath(id))}
    />
  );
}

export function PreparationNewRoute() {
  const navigate = useNavigate();
  const registerPosting = usePreparationStore((state) => state.registerPosting);
  return (
    <PreparationNewPage
      onBack={() => navigate(PREPARATION_PATH)}
      onSubmit={async (values) => {
        const id = registerPosting(values);
        navigate(postingPath(id));
      }}
    />
  );
}

export function PreparationDetailRoute() {
  const { postingId = '' } = useParams();
  const navigate = useNavigate();
  const postings = usePreparationStore((state) => state.postings);
  const deletePosting = usePreparationStore((state) => state.deletePosting);
  const posting = postings.find(({ id }) => id === postingId);
  const documents = usePostingDocuments(postingId);
  return (
    <PreparationDetailPage
      selectedId={postingId}
      postings={postings}
      detail={
        posting
          ? {
              status: 'ready',
              posting,
              documents,
              interviews: [],
              canStartInterview: false,
              interviewUnavailableReason: 'AI 면접 연결을 준비 중이에요.',
            }
          : { status: 'notFound' }
      }
      onBack={() => navigate(PREPARATION_PATH)}
      onSelectPosting={(id) => navigate(postingPath(id))}
      onEdit={(id) => navigate(`${postingPath(id)}/edit`)}
      onDelete={async (id) => {
        deletePosting(id);
        navigate(PREPARATION_PATH, { replace: true });
      }}
      onOpenDocument={(id, kind) => navigate(postingDocumentPath(id, documentId[kind]))}
    />
  );
}

export function PreparationEditRoute() {
  const { postingId = '' } = useParams();
  const navigate = useNavigate();
  const posting = usePreparationStore((state) => state.postings.find(({ id }) => id === postingId));
  const updatePosting = usePreparationStore((state) => state.updatePosting);
  if (!posting) return <MissingPosting />;
  return (
    <PreparationEditPage
      key={postingId}
      posting={posting}
      onBack={() => navigate(postingPath(postingId))}
      onSubmit={async (values) => {
        updatePosting(postingId, values);
        navigate(postingPath(postingId));
      }}
    />
  );
}

export function MasterResumeRoute() {
  const [params] = useSearchParams();
  const postingId = params.get('postingId') ?? undefined;
  const navigate = useNavigate();
  const masterResume = usePreparationStore((state) => state.masterResume);
  const postings = usePreparationStore((state) => state.postings);
  const saveMasterResume = usePreparationStore((state) => state.saveMasterResume);
  const [error, setError] = useState('');
  if (postingId && !postings.some(({ id }) => id === postingId)) return <MissingPosting />;

  function save(draft: ResumeDraft, complete = false) {
    setError('');
    if (complete && !hasMasterResume(draft)) {
      setError(
        '학력을 1개 이상 입력하고, 추가한 항목의 필수 정보를 모두 입력해주세요. 경력·자격증·수상은 해당하는 항목만 추가하면 돼요.',
      );
      return;
    }
    try {
      saveMasterResume(draft);
      if (complete)
        navigate(postingId ? postingDocumentPath(postingId) : '/home', { replace: true });
      else draftSaved();
    } catch {
      setError('임시 저장하지 못했어요. 입력 내용을 유지한 채 다시 시도해주세요.');
    }
  }

  return (
    <ResumeEditor
      key={postingId ?? 'master'}
      initialDraft={masterResume}
      visibleDocuments={['resume']}
      title="이력서 마스터본 작성"
      description={
        postingId
          ? '공고별 이력서를 작성하기 전에 마스터본을 먼저 입력해주세요. 학력은 1개 이상 입력하고, 나머지 항목은 해당하는 경우에 추가해주세요. 저장 후 이 공고의 이력서 작성으로 이어져요.'
          : '공고에 공통으로 사용할 기본 이력서를 입력해주세요. 학력은 1개 이상 입력하고, 나머지 항목은 해당하는 경우에 추가해주세요.'
      }
      error={error}
      onSaveDraft={(draft) => save(draft)}
      onComplete={(draft) => save(draft, true)}
      completeLabel={postingId ? '저장하고 공고 이력서 작성' : '저장하고 홈으로'}
    />
  );
}

export function PreparationDocumentRoute({ document }: { document: EditorDocument }) {
  const { postingId = '' } = useParams();
  const navigate = useNavigate();
  const posting = usePreparationStore((state) => state.postings.find(({ id }) => id === postingId));
  const masterResume = usePreparationStore((state) => state.masterResume);
  const resume = usePreparationStore((state) => state.resumes[postingId]);
  const coverLetter = usePreparationStore((state) => state.coverLetters[postingId]);
  const portfolio = usePreparationStore((state) => state.portfolios[postingId]);
  const documents = usePostingDocuments(postingId);
  const [error, setError] = useState('');
  const statuses = Object.fromEntries(
    documents.map(({ kind, status }) => [documentId[kind], status]),
  );
  if (!posting) return <MissingPosting />;
  if (document === 'resume' && !hasMasterResume(masterResume))
    return <Navigate to={masterResumePath(postingId)} replace />;

  const onDocumentChange = (next: EditorDocument) => navigate(postingDocumentPath(postingId, next));
  function save(action: () => void) {
    setError('');
    try {
      action();
      draftSaved();
    } catch {
      setError('임시 저장하지 못했어요. 다시 시도해주세요.');
    }
  }
  return (
    <>
      <div className="mx-auto max-w-[1440px] space-y-3 px-4 pt-6 sm:px-6 lg:px-15">
        <BackButton onClick={() => navigate(postingPath(postingId))}>공고 상세</BackButton>
        <p className="text-body2 text-text-secondary">
          {posting.companyName} · {posting.positionName}
        </p>
        {error ? (
          <p role="alert" className="text-error">
            {error}
          </p>
        ) : null}
      </div>
      {document === 'resume' ? (
        <ResumeEditor
          key={postingId}
          initialDraft={resume ?? masterResume}
          statuses={statuses}
          onDocumentChange={onDocumentChange}
          onSaveDraft={(draft) =>
            save(() => usePreparationStore.getState().saveResume(postingId, draft))
          }
        />
      ) : document === 'cover-letter' ? (
        <CoverLetterEditor
          key={postingId}
          initialQuestions={coverLetter?.questions}
          statuses={statuses}
          onDocumentChange={onDocumentChange}
          onSaveDraft={(draft) =>
            save(() => usePreparationStore.getState().saveCoverLetter(postingId, draft))
          }
        />
      ) : (
        <PortfolioEditor
          key={postingId}
          initialItems={portfolio?.items}
          initialEditingItem={portfolio?.editingItem}
          statuses={statuses}
          onDocumentChange={onDocumentChange}
          onSaveDraft={(draft) =>
            save(() => usePreparationStore.getState().savePortfolio(postingId, draft))
          }
        />
      )}
    </>
  );
}
