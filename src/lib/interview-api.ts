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

/** `POST /api/interviews/{id}/answers/audio` 200 응답 data (#119) */
export interface InterviewAnswerAudioResponseDTO {
  interview_session_id: string;
  /** 답변 반영 후 면접 세션 상태 (예: 'WAITING_FOR_QUESTION') */
  status: string;
  question_code: string;
  sequence: number;
}

export interface SubmitInterviewAnswerAudioParams {
  questionCode: string;
  sequence: number;
  file: File;
  signal?: AbortSignal;
}

export function getInterviewRemaining() {
  return apiRequest<ApiResponse<InterviewRemainingData>>('/api/interviews/remaining');
}

export function requestInterviewAnalysis(interviewSessionId: string) {
  return apiRequest<ApiResponse<InterviewAnalysisData>>(
    `/api/interviews/${encodeURIComponent(interviewSessionId)}/analysis`,
    {
      method: 'POST',
      // 자동 토큰 갱신 뒤 POST가 재전송되는 것을 막는다. 재시도는 사용자가 명시적으로 수행한다.
      skipAuthRetry: true,
    },
  );
}

export function reportInterviewError(interviewSessionId: string, content: string) {
  return apiRequest<ApiResponse<string>>(
    `/api/interviews/${encodeURIComponent(interviewSessionId)}/error-report`,
    {
      method: 'POST',
      body: { content },
    },
  );
}

/**
 * 답변 녹음 업로드 (#119).
 * `question_code`·`sequence`는 쿼리 파라미터로, 본문 `multipart/form-data`에는 `file`만 담는다.
 * `Content-Type`은 브라우저가 boundary와 함께 설정하도록 지정하지 않는다.
 * 401이면 `apiRequest` 기본 동작대로 토큰 재발급 후 같은 FormData로 1회 재시도한다.
 */
export function submitInterviewAnswerAudio(
  interviewSessionId: string,
  { questionCode, sequence, file, signal }: SubmitInterviewAnswerAudioParams,
) {
  const query = new URLSearchParams({
    question_code: questionCode,
    sequence: String(sequence),
  });
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<ApiResponse<InterviewAnswerAudioResponseDTO>>(
    `/api/interviews/${encodeURIComponent(interviewSessionId)}/answers/audio?${query.toString()}`,
    {
      method: 'POST',
      body: formData,
      signal,
    },
  );
}
