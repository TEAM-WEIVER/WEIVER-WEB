import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { JobPostingDetail } from '@/pages/preparation/_types/job-posting-detail';
import type { ResumeDraft } from '@/pages/preparation/resume/_model/resume-sections';
import type { CoverLetterDraft } from '@/pages/preparation/cover-letter/_model/cover-letter';
import type { PortfolioDraft } from '@/pages/preparation/portfolio/portfolio-editor';
import type { JobPostingValues } from '@/schemas/job-posting';
import {
  advanceResumeSource,
  withResumeEntryIds,
  type ResumeSource,
} from '@/pages/preparation/resume/_model/resume-source';

export type SaveResumeOptions = { source?: ResumeSource };

type PreparationState = {
  postings: JobPostingDetail[];
  masterResume?: ResumeDraft;
  resumes: Record<string, ResumeDraft>;
  resumeSources: Record<string, ResumeSource>;
  coverLetters: Record<string, CoverLetterDraft>;
  portfolios: Record<string, PortfolioDraft>;
  registerPosting: (values: JobPostingValues) => string;
  updatePosting: (id: string, values: JobPostingValues) => void;
  deletePosting: (id: string) => void;
  saveMasterResume: (draft: ResumeDraft) => void;
  saveResume: (
    postingId: string,
    draft: ResumeDraft,
    options?: SaveResumeOptions,
  ) => ResumeSource | undefined;
  saveCoverLetter: (postingId: string, draft: CoverLetterDraft) => void;
  savePortfolio: (postingId: string, draft: PortfolioDraft) => void;
  reset: () => void;
};

const initialState = {
  postings: [],
  masterResume: undefined,
  resumes: {},
  resumeSources: {},
  coverLetters: {},
  portfolios: {},
};

function omitPosting<Value>(record: Record<string, Value>, id: string) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

/** API 계약 확정 전의 탭 단위 임시 데이터. 서버에 등록/저장하지 않는다. */
export const usePreparationStore = create<PreparationState>()(
  persist(
    (set, get) => ({
      ...initialState,
      registerPosting: (values) => {
        const id = crypto.randomUUID();
        set((state) => ({ postings: [...state.postings, { ...values, id }] }));
        return id;
      },
      updatePosting: (id, values) =>
        set((state) => ({
          postings: state.postings.map((posting) =>
            posting.id === id ? { ...values, id } : posting,
          ),
        })),
      deletePosting: (id) =>
        set((state) => ({
          postings: state.postings.filter((posting) => posting.id !== id),
          resumes: omitPosting(state.resumes, id),
          resumeSources: omitPosting(state.resumeSources, id),
          coverLetters: omitPosting(state.coverLetters, id),
          portfolios: omitPosting(state.portfolios, id),
        })),
      saveMasterResume: (draft) => set({ masterResume: withResumeEntryIds(draft) }),
      saveResume: (postingId, draft, options) => {
        const previous = get();
        if (!previous.postings.some(({ id }) => id === postingId))
          throw new Error('공고를 찾을 수 없어요.');
        const saved = withResumeEntryIds(draft);
        const source = options?.source ?? previous.resumeSources[postingId];
        const nextSource = source ? advanceResumeSource(source, saved) : undefined;
        // TODO(#153): API 계약 확정 후 공고 ID별 조회/저장 및 실패·재시도를 연결한다.
        // TODO(#205): 마스터본 반영 선택과 변경분 적용은 후속 이슈에서 구현한다.
        try {
          set({
            resumes: { ...previous.resumes, [postingId]: saved },
            resumeSources: nextSource
              ? { ...previous.resumeSources, [postingId]: nextSource }
              : previous.resumeSources,
          });
        } catch (error) {
          try {
            set(previous);
          } catch {
            /* persist가 실패해도 메모리 상태는 먼저 복원된다. */
          }
          throw error;
        }
        return nextSource;
      },
      saveCoverLetter: (postingId, draft) =>
        set((state) => ({
          coverLetters: { ...state.coverLetters, [postingId]: structuredClone(draft) },
        })),
      // File은 JSON으로 복원할 수 없으므로 현재 페이지 세션의 메모리에만 보관한다.
      savePortfolio: (postingId, draft) =>
        set((state) => ({
          portfolios: { ...state.portfolios, [postingId]: draft },
        })),
      reset: () => set(initialState),
    }),
    {
      name: 'weiver.preparation.drafts',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // TODO(#153): 공고 ID별 서류·마스터본 조회/저장 API로 교체한다.
      partialize: ({ postings, masterResume, resumes, resumeSources, coverLetters }) => ({
        postings,
        masterResume,
        resumes,
        resumeSources,
        coverLetters,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PreparationState> | undefined;
        return {
          ...current,
          ...saved,
          masterResume: saved?.masterResume ? withResumeEntryIds(saved.masterResume) : undefined,
          resumes: Object.fromEntries(
            Object.entries(saved?.resumes ?? {}).map(([id, draft]) => [
              id,
              withResumeEntryIds(draft),
            ]),
          ),
          resumeSources: saved?.resumeSources ?? {},
        };
      },
    },
  ),
);
