import type {
  ApplicationDocument,
  JobPostingSummary,
} from '@/pages/preparation/_types/job-posting-detail';

/** API 계약과 독립적인 화면 상태. 미연결은 빈 데이터와 구분한다. */
export type HomeSectionState<Data> =
  | { status: 'ready'; data: Data }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' };

export type ResumeSummary = {
  status: ApplicationDocument['status'];
  required?: boolean;
};

export type HomePoints = {
  balance: number;
  /** 확정된 과금 정책이 있을 때만 표시한다. */
  interviewCost?: number;
};

export type HomeJobPosting = JobPostingSummary & {
  documents: ApplicationDocument[];
  interviewCount: number;
};

export type HomePostings = {
  postings: HomeJobPosting[];
  /** 홈에 표시된 공고 수와 구분되는 전체 공고 수. */
  total: number;
};
