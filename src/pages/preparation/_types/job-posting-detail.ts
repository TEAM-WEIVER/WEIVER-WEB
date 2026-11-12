import type { JobPostingValues } from '@/schemas/job-posting';

/** 화면 구성용 모델. 백엔드 DTO가 확정되면 API 어댑터에서 변환한다. */
export type JobPostingSummary = Pick<JobPostingValues, 'companyName' | 'positionName'> & {
  id: string;
};

export type JobPostingDetail = JobPostingSummary & Pick<JobPostingValues, 'sourceUrl' | 'content'>;

export type ApplicationDocument = {
  kind: 'resume' | 'coverLetter' | 'portfolio';
  status: 'notStarted' | 'inProgress' | 'complete';
  required: boolean;
};

export type InterviewRecord = {
  id: string;
  /** 날짜만 담은 ISO 문자열: YYYY-MM-DD */
  date: string;
  score: number | null;
  reportAvailable: boolean;
};
