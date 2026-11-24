import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

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
import { PostingResumeEditor } from './resume/posting-resume-editor';

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

export { MasterResumeRoute } from './resume/master-resume-route';

export function PreparationDocumentRoute({ document }: { document: EditorDocument }) {
  const { postingId = '' } = useParams();
  const navigate = useNavigate();
  const posting = usePreparationStore((state) => state.postings.find(({ id }) => id === postingId));
  const masterResume = usePreparationStore((state) => state.masterResume);
  const resume = usePreparationStore((state) => state.resumes[postingId]);
  const resumeSource = usePreparationStore((state) => state.resumeSources[postingId]);
  const coverLetter = usePreparationStore((state) => state.coverLetters[postingId]);
  const portfolio = usePreparationStore((state) => state.portfolios[postingId]);
  const documents = usePostingDocuments(postingId);
  const [error, setError] = useState('');
  const statuses = Object.fromEntries(
    documents.map(({ kind, status }) => [documentId[kind], status]),
  );
  if (!posting) return <MissingPosting />;
  if (document === 'resume' && !resume && !hasMasterResume(masterResume))
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
        <PostingResumeEditor
          key={postingId}
          initialDraft={resume}
          masterResume={masterResume}
          source={resumeSource}
          statuses={statuses}
          onDocumentChange={onDocumentChange}
          onSave={(draft, options) => {
            const source = usePreparationStore.getState().saveResume(postingId, draft, options);
            draftSaved();
            return source;
          }}
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
