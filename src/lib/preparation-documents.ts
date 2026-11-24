import type { ApplicationDocument } from '@/pages/preparation/_types/job-posting-detail';
import {
  isQuestionComplete,
  type CoverLetterDraft,
} from '@/pages/preparation/cover-letter/_model/cover-letter';
import type { PortfolioDraft } from '@/pages/preparation/portfolio/portfolio-editor';
import { getResumeProgress } from '@/pages/preparation/resume/_model/master-resume';
import type { ResumeDraft } from '@/pages/preparation/resume/_model/resume-sections';

export function getPostingDocuments(
  state: {
    resumes: Record<string, ResumeDraft>;
    coverLetters: Record<string, CoverLetterDraft>;
    portfolios: Record<string, PortfolioDraft>;
  },
  postingId: string,
): ApplicationDocument[] {
  const questions = state.coverLetters[postingId]?.questions ?? [];
  const portfolio = state.portfolios[postingId];
  return [
    { kind: 'resume', required: true, status: getResumeProgress(state.resumes[postingId]).status },
    {
      kind: 'coverLetter',
      required: true,
      status: !questions.length
        ? 'notStarted'
        : questions.every(isQuestionComplete)
          ? 'complete'
          : 'inProgress',
    },
    {
      kind: 'portfolio',
      required: false,
      status: portfolio?.items.length
        ? 'complete'
        : portfolio?.editingItem?.file
          ? 'inProgress'
          : 'notStarted',
    },
  ];
}
