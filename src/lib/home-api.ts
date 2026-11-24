import { apiRequest } from './api-client';
import { getResumeProgress } from '@/pages/preparation/resume/_model/master-resume';
import type { ResumeDraft } from '@/pages/preparation/resume/_model/resume-sections';
import type { HomePoints, HomePostings, ResumeSummary } from '@/pages/home/_types/home';

/** #202 화면 연동 계약. 백엔드 확정 DTO는 이 어댑터에서 변환한다. */
type Response<Data> = { data: Data };
export const MASTER_RESUME_API_PATH = '/api/resumes/master';
export const HOME_POINTS_API_PATH = '/api/home/points';
export const HOME_POSTINGS_API_PATH = '/api/home/postings';

export async function loadMasterResume(signal?: AbortSignal) {
  const response = await apiRequest<Response<{ draft: ResumeDraft | null }>>(
    MASTER_RESUME_API_PATH,
    { signal },
  );
  return response.data.draft;
}

export function summarizeMasterResume(draft: ResumeDraft | null): ResumeSummary {
  const hasInput =
    draft &&
    Object.values(draft).some((rows) =>
      rows.some((row) => Object.values(row).some((value) => value.trim())),
    );
  const progress = getResumeProgress(draft ?? undefined);
  return { status: progress.status === 'notStarted' && hasInput ? 'inProgress' : progress.status };
}

export async function loadResumeSummary(signal?: AbortSignal) {
  return summarizeMasterResume(await loadMasterResume(signal));
}

export async function saveMasterResume(
  draft: ResumeDraft,
  complete: boolean,
  signal?: AbortSignal,
) {
  const response = await apiRequest<Response<{ draft: ResumeDraft }>>(MASTER_RESUME_API_PATH, {
    method: 'PUT',
    signal,
    body: { draft, complete },
  });
  return response.data.draft;
}

export async function loadHomePoints(signal?: AbortSignal): Promise<HomePoints> {
  const response = await apiRequest<Response<{ balance: number; interviewCost?: number }>>(
    HOME_POINTS_API_PATH,
    { signal },
  );
  return { balance: response.data.balance, interviewCost: response.data.interviewCost };
}

export async function loadHomePostings(signal?: AbortSignal): Promise<HomePostings> {
  const response = await apiRequest<Response<HomePostings>>(HOME_POSTINGS_API_PATH, { signal });
  return { total: response.data.total, postings: response.data.postings };
}
