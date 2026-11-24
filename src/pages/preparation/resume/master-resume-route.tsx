import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useApiResource } from '@/hooks/use-api-resource';
import { loadMasterResume, saveMasterResume } from '@/lib/home-api';
import { postingDocumentPath } from '@/lib/preparation-paths';
import { usePreparationStore } from '@/store/preparation-store';
import { toast } from '@/store/toast-store';

import { hasMasterResume } from './_model/master-resume';
import type { ResumeDraft } from './_model/resume-sections';
import ResumeEditor from './page';

export function MasterResumeRoute() {
  const [params] = useSearchParams();
  const postingId = params.get('postingId');
  const navigate = useNavigate();
  const posting = usePreparationStore((state) => state.postings.find(({ id }) => id === postingId));
  const resource = useApiResource(loadMasterResume);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const saveRequest = useRef<AbortController | null>(null);
  useEffect(() => () => saveRequest.current?.abort(), []);

  async function save(draft: ResumeDraft, complete = false) {
    if (savingRef.current) return;
    setError('');
    if (complete && !hasMasterResume(draft)) {
      setError('학력을 1개 이상 입력하고, 추가한 항목의 필수 정보를 모두 입력해주세요.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const controller = new AbortController();
    saveRequest.current = controller;
    try {
      const saved = await saveMasterResume(draft, complete, controller.signal);
      if (controller.signal.aborted) return;
      usePreparationStore.getState().saveMasterResume(saved);
      if (complete)
        navigate(postingId ? postingDocumentPath(postingId) : '/home', { replace: true });
      else toast.add({ type: 'success', title: '이력서를 임시 저장했어요.' });
    } catch {
      if (controller.signal.aborted) return;
      setError('이력서를 저장하지 못했어요. 입력한 내용은 유지돼요. 다시 시도해주세요.');
    } finally {
      savingRef.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  if (postingId && !posting)
    return (
      <main className="mx-auto max-w-[1440px] space-y-4 px-6 py-10">
        <h1 className="text-h2">공고를 찾을 수 없어요.</h1>
        <Button onClick={() => navigate('/preparation')}>지원 공고 목록</Button>
      </main>
    );

  return (
    <>
      {resource.state.status === 'loading' ? (
        <main
          className="flex min-h-60 items-center justify-center gap-3"
          role="status"
          aria-label="이력서 불러오는 중"
        >
          <Spinner />
          이력서를 불러오고 있어요.
        </main>
      ) : resource.state.status === 'error' ? (
        <main className="mx-auto max-w-[1440px] space-y-4 px-6 py-10">
          <h1 className="text-h2">이력서 마스터본 작성</h1>
          <p role="alert">이력서를 불러오지 못했어요.</p>
          <Button onClick={resource.retry}>다시 불러오기</Button>
        </main>
      ) : (
        <ResumeEditor
          key={postingId ?? 'master'}
          initialDraft={resource.state.data ?? undefined}
          visibleDocuments={['resume']}
          title="이력서 마스터본 작성"
          description="공고에 공통으로 사용할 기본 이력서를 입력해주세요. 학력은 1개 이상 입력하고, 나머지 항목은 해당하는 경우에 추가해주세요."
          error={error}
          isSaving={saving}
          onSaveDraft={(draft) => {
            void save(draft);
          }}
          onComplete={(draft) => {
            void save(draft, true);
          }}
          completeLabel={postingId ? '저장하고 공고 이력서 작성' : '저장하고 홈으로'}
        />
      )}
    </>
  );
}
