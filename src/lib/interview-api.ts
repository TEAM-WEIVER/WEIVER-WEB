import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export interface InterviewRemainingData {
  totalCount: number;
  remainingCount: number;
  reapplyDDay: number;
  reapplyAvailableDate: string;
  pendingSubmissionSessionId: string | null;
}

export interface InterviewAnalysisData {
  interview_session_id: string;
  status: 'TRANSCRIPT_SAVE_REQUESTED';
  next_available_interview_at: string;
}

export function getInterviewRemaining() {
  return apiRequest<ApiResponse<InterviewRemainingData>>('/api/interviews/remaining');
}

export function requestInterviewAnalysis(interviewSessionId: string) {
  return apiRequest<ApiResponse<InterviewAnalysisData>>(
    `/api/interviews/${interviewSessionId}/analysis`,
    {
      method: 'POST',
      // 자동 토큰 갱신 뒤 POST가 재전송되는 것을 막는다. 재시도는 사용자가 명시적으로 수행한다.
      skipAuthRetry: true,
    },
  );
}

export function reportInterviewError(interviewSessionId: string, content: string) {
  return apiRequest<ApiResponse<string>>(`/api/interviews/${interviewSessionId}/error-report`, {
    method: 'POST',
    body: { content },
  });
}
