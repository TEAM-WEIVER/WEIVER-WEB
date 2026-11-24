import { useRef, useState } from 'react';

import type { DocumentEditorLayoutProps } from '@/components/common/DocumentEditorLayout';
import type { SaveResumeOptions } from '@/store/preparation-store';

import { MasterResumeImportDialog } from './_components/master-resume-import-dialog';
import { hasMasterResume } from './_model/master-resume';
import type { ResumeDraft } from './_model/resume-sections';
import { createResumeSource, withResumeEntryIds, type ResumeSource } from './_model/resume-source';
import ResumeEditor from './page';

type PostingResumeEditorProps = Pick<DocumentEditorLayoutProps, 'statuses' | 'onDocumentChange'> & {
  initialDraft?: ResumeDraft;
  masterResume?: ResumeDraft;
  source?: ResumeSource;
  onSave: (draft: ResumeDraft, options: SaveResumeOptions) => ResumeSource | undefined;
};

export function PostingResumeEditor({
  initialDraft,
  masterResume,
  source,
  onSave,
  statuses,
  onDocumentChange,
}: PostingResumeEditorProps) {
  const [session, setSession] = useState(() => ({ initialDraft, source, version: 0 }));
  const [pendingImport, setPendingImport] = useState<ResumeDraft | null>(null);
  const [error, setError] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);

  function restoreFocus() {
    if (returnFocus.current?.isConnected) return returnFocus.current.focus();
    editorRoot.current?.querySelector<HTMLButtonElement>('button[data-load-master]')?.focus();
  }

  function importMaster(draft: ResumeDraft) {
    setSession((current) => ({
      initialDraft: draft,
      source: createResumeSource(draft),
      version: current.version + 1,
    }));
    setPendingImport(null);
    setError('');
  }

  function requestImport(currentDraft: ResumeDraft) {
    if (!hasMasterResume(masterResume)) return;
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const snapshot = withResumeEntryIds(masterResume);
    if (Object.values(currentDraft).some((entries) => entries.length)) setPendingImport(snapshot);
    else importMaster(snapshot);
  }

  function save(draft: ResumeDraft) {
    setError('');
    try {
      // TODO(#205): 불러오기/저장 기준과 비교하여 마스터본 반영 여부를 선택하도록 연결한다.
      const nextSource = onSave(draft, { source: session.source });
      setSession((current) => ({ ...current, source: nextSource }));
    } catch {
      setError('임시 저장하지 못했어요. 입력 내용은 유지되어 있어요. 다시 시도해주세요.');
    }
  }

  return (
    <div ref={editorRoot}>
      <ResumeEditor
        key={session.version}
        initialDraft={session.initialDraft}
        trackEntryIds
        title="공고별 이력서 작성"
        description="이 공고에 사용할 이력서를 작성해주세요. 마스터본 불러오기로 기본 내용을 가져온 뒤 공고에 맞게 수정할 수 있어요."
        statuses={statuses}
        onDocumentChange={onDocumentChange}
        onLoadMaster={requestImport}
        canLoadMaster={hasMasterResume(masterResume)}
        onSaveDraft={save}
        error={error}
      />
      <MasterResumeImportDialog
        open={pendingImport !== null}
        onCancel={() => setPendingImport(null)}
        onReturnFocus={restoreFocus}
        onConfirm={() => {
          if (pendingImport) importMaster(pendingImport);
        }}
      />
    </div>
  );
}
