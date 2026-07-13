import { create } from 'zustand';

// ──────────────────────────────────────────────
// 상태 열거형
// ──────────────────────────────────────────────

export type InterviewStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'QUESTION'
  | 'SUBMITTING'
  | 'RECONNECTING'
  | 'FINISHED'
  | 'ERROR';

// ──────────────────────────────────────────────
// STOMP 메시지 페이로드 타입 (명세 §8 기준)
// ──────────────────────────────────────────────

interface BasePayload {
  interview_session_id: string;
  status: string;
  question_code: string | null;
  sequence: number | null;
  question: string | null;
  message: string | null;
}

export interface SessionStartedPayload extends BasePayload {
  type: 'SESSION_STARTED';
}

export interface QuestionReadyPayload extends BasePayload {
  type: 'QUESTION_READY';
  question_code: string;
  sequence: number;
  question: string;
}

export interface AnswerAcceptedPayload extends BasePayload {
  type: 'ANSWER_ACCEPTED';
}

export interface InterviewFinishedPayload extends BasePayload {
  type: 'INTERVIEW_FINISHED';
}

export type InterviewMessage =
  | SessionStartedPayload
  | QuestionReadyPayload
  | AnswerAcceptedPayload
  | InterviewFinishedPayload;

// ──────────────────────────────────────────────
// question_code prefix → 면접 차수 레이블
// ──────────────────────────────────────────────

export function getRoundLabel(questionCode: string | null): string {
  if (!questionCode) return '면접';
  if (questionCode.startsWith('S_')) return '1차 면접 - 기술 면접';
  if (questionCode.startsWith('C_')) return '2차 면접 - 인성 면접';
  return '면접';
}

// ──────────────────────────────────────────────
// 스토어 타입
// ──────────────────────────────────────────────

interface InterviewState {
  status: InterviewStatus;
  interviewSessionId: string | null;
  currentQuestion: string | null;
  currentQuestionCode: string | null;
  currentSequence: number | null;
  errorMessage: string | null;
  /** AC2-a: 중복 메시지 방어용 — 마지막 수신한 sessionId+sequence 조합 */
  lastReceivedKey: string | null;

  setStatus: (status: InterviewStatus) => void;
  setSessionStarted: (sessionId: string) => void;
  setQuestion: (payload: QuestionReadyPayload) => void;
  setAnswerAccepted: () => void;
  setError: (message: string | null) => void;
  setFinished: () => void;
  reset: () => void;
}

const initialState = {
  status: 'IDLE' as InterviewStatus,
  interviewSessionId: null,
  currentQuestion: null,
  currentQuestionCode: null,
  currentSequence: null,
  errorMessage: null,
  lastReceivedKey: null,
};

export const useInterviewStore = create<InterviewState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  // SESSION_STARTED: session ID 저장 후 QUESTION_READY 대기 (SUBSCRIBED 유지)
  setSessionStarted: (sessionId) =>
    set({
      interviewSessionId: sessionId,
      status: 'SUBSCRIBED',
    }),

  setQuestion: (payload) => {
    const { lastReceivedKey, currentSequence } = get();
    const key = `${payload.interview_session_id}:${payload.sequence}`;

    // AC2-a: 중복 메시지 또는 역행 sequence 무시
    if (lastReceivedKey === key) return;
    if (currentSequence !== null && payload.sequence < currentSequence) return;

    set({
      currentQuestion: payload.question,
      currentQuestionCode: payload.question_code,
      currentSequence: payload.sequence,
      lastReceivedKey: key,
      status: 'QUESTION',
    });
  },

  // ANSWER_ACCEPTED: 다음 QUESTION_READY 대기 — 로딩 화면(SUBSCRIBED)으로 전환
  setAnswerAccepted: () =>
    set({
      status: 'SUBSCRIBED',
    }),

  setError: (message) =>
    set({
      status: 'ERROR',
      errorMessage: message,
    }),

  setFinished: () =>
    set({
      status: 'FINISHED',
      interviewSessionId: null,
      currentQuestion: null,
      currentQuestionCode: null,
      currentSequence: null,
      lastReceivedKey: null,
    }),

  reset: () => set(initialState),
}));
