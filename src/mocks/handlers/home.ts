import { delay, http, HttpResponse } from 'msw';

import { getPostingDocuments } from '@/lib/preparation-documents';
import { hasMasterResume } from '@/pages/preparation/resume/_model/master-resume';
import {
  resumeSections,
  type ResumeDraft,
} from '@/pages/preparation/resume/_model/resume-sections';
import { usePreparationStore } from '@/store/preparation-store';

const ok = (data: unknown) => HttpResponse.json({ status: 'OK', code: 200, data, message: 'OK' });
const unauthorized = () => HttpResponse.json({ message: '로그인이 필요해요.' }, { status: 401 });
const isMember = () => sessionStorage.getItem('weiver.auth.role') === 'APPLICANT';

function isDraft(value: unknown): value is ResumeDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return Object.entries(resumeSections).every(([section, config]) => {
    const rows = draft[section];
    return (
      Array.isArray(rows) &&
      rows.every(
        (row) =>
          row &&
          typeof row === 'object' &&
          config.fields.every(({ name }) => typeof row[name] === 'string'),
      )
    );
  });
}

/** 개발 모드 전용 HTTP mock. #203의 탭 단위 보관소를 mock DB로 공유한다. */
export const homeHandlers = [
  http.get('*/api/auth/csrf', () => ok({ csrfToken: 'mock-csrf-token' })),
  http.post('*/api/auth/applicants/login', () =>
    ok({ accessToken: 'mock-access-token', role: 'APPLICANT' }),
  ),
  http.post('*/api/auth/reissue', () =>
    isMember() ? ok({ accessToken: 'mock-access-token' }) : unauthorized(),
  ),
  http.get('*/api/applicants', () =>
    isMember() ? ok({ ApplicantDTO: { name: '김위버' } }) : unauthorized(),
  ),
  http.get('*/api/resumes/master', async () => {
    await delay(150);
    return isMember()
      ? ok({ draft: usePreparationStore.getState().masterResume ?? null })
      : unauthorized();
  }),
  http.put('*/api/resumes/master', async ({ request }) => {
    if (!isMember()) return unauthorized();
    const body = (await request.json()) as { draft?: unknown; complete?: boolean };
    if (!isDraft(body.draft) || (body.complete && !hasMasterResume(body.draft))) {
      return HttpResponse.json({ message: '이력서 입력값을 확인해주세요.' }, { status: 400 });
    }
    await delay(250);
    try {
      usePreparationStore.getState().saveMasterResume(body.draft);
      return ok({ draft: usePreparationStore.getState().masterResume });
    } catch {
      return HttpResponse.json({ message: '저장하지 못했어요.' }, { status: 500 });
    }
  }),
  http.get('*/api/home/points', async () => {
    await delay(150);
    return isMember() ? ok({ balance: 300, interviewCost: 100 }) : unauthorized();
  }),
  http.get('*/api/home/postings', async () => {
    await delay(150);
    if (!isMember()) return unauthorized();
    const state = usePreparationStore.getState();
    return ok({
      total: state.postings.length,
      postings: state.postings.slice(0, 3).map((posting) => ({
        ...posting,
        documents: getPostingDocuments(state, posting.id),
        interviewCount: 0,
      })),
    });
  }),
  http.post('*/api/inquiries', async ({ request }) => {
    if (!isMember()) return unauthorized();
    const body = (await request.json()) as { title?: string; content?: string };
    if (!body.title?.trim() || !body.content?.trim())
      return HttpResponse.json({ message: '제목과 내용을 입력해주세요.' }, { status: 400 });
    return ok(null);
  }),
  // 명시적인 mock 모드에서 미구현 API를 실제 서버로 전달하지 않는다.
  http.all('*/api/*', () =>
    HttpResponse.json({ message: '개발 mock에서 지원하지 않는 API입니다.' }, { status: 501 }),
  ),
];
