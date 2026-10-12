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
  audio_url: string | null;
  audio_status: 'READY' | 'UNAVAILABLE' | null;
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
// 질문 키 (#119)
// ──────────────────────────────────────────────

/**
 * 질문 하나를 식별하는 키: `{interviewSessionId}:{question_code}:{sequence}`.
 * reset 후 새 세션도 sequence 1부터 시작하므로 sequence만으로 비교하지 않는다.
 */
export function getQuestionKey(
  sessionId: string | null,
  questionCode: string | null,
  sequence: number | null,
): string | null {
  if (!sessionId || !questionCode || sequence === null) return null;
  return `${sessionId}:${questionCode}:${sequence}`;
}

export interface AnswerAcceptedParams {
  sessionId: string;
  /** 서버가 필드를 빼고 보내면 `undefined`일 수 있다. 이때도 비교를 생략한다. */
  questionCode?: string | null;
  sequence?: number | null;
}

export interface AudioAnswerAcceptedParams {
  sessionId: string;
  questionCode: string;
  sequence: number;
}

/** 현재 store 상태의 질문 키 셀렉터 */
export function selectCurrentQuestionKey(state: {
  interviewSessionId: string | null;
  currentQuestionCode: string | null;
  currentSequence: number | null;
}) {
  return getQuestionKey(state.interviewSessionId, state.currentQuestionCode, state.currentSequence);
}

const ANSWER_ACCEPTABLE_STATUSES: ReadonlySet<InterviewStatus> = new Set([
  'QUESTION',
  'SUBMITTING',
]);

// ──────────────────────────────────────────────
// 스토어 타입
// ──────────────────────────────────────────────

interface InterviewState {
  status: InterviewStatus;
  interviewSessionId: string | null;
  currentQuestion: string | null;
  currentQuestionCode: string | null;
  currentSequence: number | null;
  currentAudioUrl: string | null;
  currentAudioStatus: 'READY' | 'UNAVAILABLE' | null;
  errorMessage: string | null;
  /** AC2-a: 중복 메시지 방어용 — 마지막 수신한 질문 키(`sessionId:question_code:sequence`) */
  lastReceivedKey: string | null;
  /**
   * #119: 답변 수락으로 실제로 SUBSCRIBED 전이했을 때의 질문 키.
   * "현재 질문의 답변이 수락되었다"는 판정은 status가 아니라 이 값과 현재 질문 키의 일치로 한다.
   */
  answerAcceptedKey: string | null;

  setStatus: (status: InterviewStatus) => void;
  setSessionStarted: (sessionId: string) => void;
  setQuestion: (payload: QuestionReadyPayload) => void;
  setAnswerAccepted: (params: AnswerAcceptedParams) => void;
  setAudioAnswerAccepted: (params: AudioAnswerAcceptedParams) => void;
  setError: (message: string | null) => void;
  setFinished: (sessionId: string) => boolean;
  reset: () => void;
}

const initialState = {
  status: 'IDLE' as InterviewStatus,
  interviewSessionId: null,
  currentQuestion: null,
  currentQuestionCode: null,
  currentSequence: null,
  currentAudioUrl: null,
  currentAudioStatus: null as 'READY' | 'UNAVAILABLE' | null,
  errorMessage: null,
  lastReceivedKey: null,
  answerAcceptedKey: null,
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
    const { lastReceivedKey, currentSequence, interviewSessionId } = get();

    // #119: 활성 세션을 알고 있으면 다른 세션의 QUESTION_READY는 무시한다
    if (interviewSessionId && payload.interview_session_id !== interviewSessionId) return;

    const key =
      getQuestionKey(payload.interview_session_id, payload.question_code, payload.sequence) ??
      `${payload.interview_session_id}:${payload.question_code ?? ''}:${payload.sequence}`;

    // AC2-a: 중복 메시지 또는 역행 sequence 무시
    if (lastReceivedKey === key) return;
    if (currentSequence !== null && payload.sequence < currentSequence) return;

    set({
      currentQuestion: payload.question,
      currentQuestionCode: payload.question_code,
      currentSequence: payload.sequence,
      currentAudioUrl: payload.audio_url ?? null,
      currentAudioStatus: payload.audio_status ?? null,
      lastReceivedKey: key,
      status: 'QUESTION',
    });
  },

  // STOMP ANSWER_ACCEPTED: 현재 질문의 수락일 때만 다음 QUESTION_READY 대기(SUBSCRIBED)로 전환한다.
  // question_code/sequence가 null이거나 payload에 없으면(undefined) 해당 비교는 생략한다(확인 필요 #11).
  setAnswerAccepted: ({ sessionId, questionCode, sequence }) => {
    const state = get();
    if (!state.interviewSessionId || sessionId !== state.interviewSessionId) return;
    if (questionCode != null && questionCode !== state.currentQuestionCode) return;
    if (sequence != null && sequence !== state.currentSequence) return;
    if (!ANSWER_ACCEPTABLE_STATUSES.has(state.status)) return;

    set({ status: 'SUBSCRIBED', answerAcceptedKey: selectCurrentQuestionKey(state) });
  },

  // 업로드 200 / 409 NOT_READY: 요청 시점의 질문 키가 현재 질문 키와 같을 때만 전환한다.
  setAudioAnswerAccepted: ({ sessionId, questionCode, sequence }) => {
    const state = get();
    const currentKey = selectCurrentQuestionKey(state);
    if (!currentKey || currentKey !== getQuestionKey(sessionId, questionCode, sequence)) return;
    if (!ANSWER_ACCEPTABLE_STATUSES.has(state.status)) return;

    set({ status: 'SUBSCRIBED', answerAcceptedKey: currentKey });
  },

  setError: (message) =>
    set({
      status: 'ERROR',
      errorMessage: message,
    }),

  // 종료 이벤트가 현재 세션과 일치할 때만 세션 ID를 보존한 채 종료한다.
  // 분석 요청이 이 ID를 사용하므로 대시보드 이탈 전에는 초기화하지 않는다.
  setFinished: (sessionId) => {
    if (!sessionId || get().interviewSessionId !== sessionId) return false;

    set({
      status: 'FINISHED',
      currentQuestion: null,
      lastReceivedKey: null,
    });
    return true;
  },

  reset: () => set(initialState),
}));
