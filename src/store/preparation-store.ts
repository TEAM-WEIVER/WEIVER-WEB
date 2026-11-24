import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { JobPostingDetail } from '@/pages/preparation/_types/job-posting-detail';
import type { ResumeDraft } from '@/pages/preparation/resume/_model/resume-sections';
import type { CoverLetterDraft } from '@/pages/preparation/cover-letter/_model/cover-letter';
import type { PortfolioDraft } from '@/pages/preparation/portfolio/portfolio-editor';
import type { JobPostingValues } from '@/schemas/job-posting';

type PreparationState = {
  postings: JobPostingDetail[];
  masterResume?: ResumeDraft;
  resumes: Record<string, ResumeDraft>;
  coverLetters: Record<string, CoverLetterDraft>;
  portfolios: Record<string, PortfolioDraft>;
  registerPosting: (values: JobPostingValues) => string;
  updatePosting: (id: string, values: JobPostingValues) => void;
  deletePosting: (id: string) => void;
  saveMasterResume: (draft: ResumeDraft) => void;
  saveResume: (postingId: string, draft: ResumeDraft) => void;
  saveCoverLetter: (postingId: string, draft: CoverLetterDraft) => void;
  savePortfolio: (postingId: string, draft: PortfolioDraft) => void;
  reset: () => void;
};

const initialState = {
  postings: [],
  masterResume: undefined,
  resumes: {},
  coverLetters: {},
  portfolios: {},
};

function omitPosting<Value>(record: Record<string, Value>, id: string) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

/** API 계약 확정 전의 탭 단위 임시 데이터. 서버에 등록/저장하지 않는다. */
export const usePreparationStore = create<PreparationState>()(
  persist(
    (set) => ({
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
          coverLetters: omitPosting(state.coverLetters, id),
          portfolios: omitPosting(state.portfolios, id),
        })),
      saveMasterResume: (draft) => set({ masterResume: structuredClone(draft) }),
      saveResume: (postingId, draft) =>
        set((state) => ({
          resumes: { ...state.resumes, [postingId]: structuredClone(draft) },
        })),
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
      partialize: ({ postings, masterResume, resumes, coverLetters }) => ({
        postings,
        masterResume,
        resumes,
        coverLetters,
      }),
    },
  ),
);
