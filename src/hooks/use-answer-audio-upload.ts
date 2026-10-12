'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiError, REISSUE_FAILED_MESSAGE } from '@/lib/api-client';
import { createAnswerAudioFile } from '@/lib/audio-recording';
import { submitInterviewAnswerAudio } from '@/lib/interview-api';
import {
  getQuestionKey,
  selectCurrentQuestionKey,
  useInterviewStore,
  type InterviewStatus,
} from '@/store/interview-store';
import { toast } from '@/store/toast-store';

// ──────────────────────────────────────────────
// 타입 · 상수
// ──────────────────────────────────────────────

export type AnswerUploadPhase = 'idle' | 'uploading' | 'retryable' | 'waiting';

/**
 * - `rerecord-required`: AC6(400/413/422)으로 `uploading` → `idle` 전이를 실제로 적용했다.
 *   화면은 이 결과를 받은 지점에서 `recorder.cancel()`을 호출한다.
 * - `none`: 그 밖의 모든 경우(성공, 409, retryable, 인증 실패, 응답 무시, deadline 만료, 무시된 호출).
 */
export type UploadResult = 'rerecord-required' | 'none';

/** 업로드 훅이 소유하는 전체 체인(CSRF → 업로드 → 재발급 → 재시도) deadline */
export const ANSWER_UPLOAD_DEADLINE_MS = 35_000;

export const ANSWER_UPLOAD_MESSAGES = {
  tooLong: '답변은 최대 2분까지 가능해요. 2분 안으로 다시 녹음해 주세요.',
  audioInvalid: '녹음 파일을 처리할 수 없어요. 다시 녹음해 주세요.',
  tooLarge: '녹음 파일이 너무 커요(최대 10MB). 조금 더 짧게 다시 녹음해 주세요.',
  notRecognized: '음성이 인식되지 않았어요. 조용한 곳에서 또렷하게 다시 녹음해 주세요.',
  rateLimited: '요청이 많아 처리하지 못했어요. 잠시 후 다시 제출해 주세요.',
  transcriptionFailed:
    '음성 변환에 실패했어요. 다시 제출해 주세요. 계속 실패하면 다시 녹음해 주세요.',
  network: '답변 전송에 실패했어요. 네트워크 상태를 확인한 뒤 다시 제출해 주세요.',
  serverError: '서버에 일시적인 문제가 생겼어요. 잠시 후 다시 제출해 주세요.',
  clientError:
    "답변을 전송하지 못했어요. 다시 제출해 주시고, 계속 실패하면 '오류가 있어요' 버튼으로 알려주세요.",
  sessionExpired: '로그인이 만료되었어요. 다시 로그인해 주세요.',
} as const;

export type UploadErrorOutcome =
  | { kind: 'auth' }
  | { kind: 'rerecord'; message: string }
  | { kind: 'finished' }
  | { kind: 'accepted' }
  | { kind: 'retryable'; message: string };

/**
 * 업로드 오류 판정 (단일 기준). HTTP 상태를 먼저 보고, errorCode(`apiStatus`)는 400·409 안에서만 쓴다.
 * 1. 응답 없음(AbortError, 네트워크 TypeError 등) → AC10
 * 2. 인증 실패(재발급 실패 또는 재시도 후 401) → AC12
 * 3. 400/413/422 → AC6, 4. 409 → AC7, 5. 429 → AC8, 6. 502 → AC9, 7. 그 외 → AC11
 */
export function classifyUploadError(error: unknown): UploadErrorOutcome {
  if (!(error instanceof ApiError)) {
    return { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.network };
  }

  // 업로드 체인의 401은 모두 인증 실패로 본다. 재시도 응답 401(a)·재발급 실패(b) 외에
  // CSRF 조회(/api/auth/csrf)의 401도 포함되지만, 이 경우도 세션이 유효하지 않으므로 의도적으로 로그아웃한다.
  if (error.isReissueFailure || error.message === REISSUE_FAILED_MESSAGE || error.status === 401) {
    return { kind: 'auth' };
  }

  switch (error.status) {
    case 400:
      return {
        kind: 'rerecord',
        message:
          error.apiStatus === 'INTERVIEW_ANSWER_TOO_LONG'
            ? ANSWER_UPLOAD_MESSAGES.tooLong
            : ANSWER_UPLOAD_MESSAGES.audioInvalid,
      };
    case 413:
      return { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.tooLarge };
    case 422:
      return { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.notRecognized };
    case 409:
      return error.apiStatus === 'INTERVIEW_ALREADY_COMPLETED'
        ? { kind: 'finished' }
        : { kind: 'accepted' };
    case 429:
      return { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.rateLimited };
    case 502:
      return { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.transcriptionFailed };
    default:
      return {
        kind: 'retryable',
        message:
          error.status >= 500
            ? ANSWER_UPLOAD_MESSAGES.serverError
            : ANSWER_UPLOAD_MESSAGES.clientError,
      };
  }
}

export interface UseAnswerAudioUploadOptions {
  /** page가 `useInterviewWebSocket()`에서 받아 주입한다. setFinished + disconnect (AC7) */
  finishInterview: (interviewSessionId: string) => boolean;
  /** page가 `useInterviewWebSocket()`에서 받아 주입한다. 종료 플래그 + 타이머 정리 + deactivate (AC12) */
  disconnect: () => void;
}

export interface UseAnswerAudioUploadReturn {
  /** 현재 질문 키 기준 phase. 질문 키가 바뀌면 `idle` */
  phase: AnswerUploadPhase;
  /** 업로드 관련 안내 문구 (retryable/AC6 등은 role="alert") */
  message: string | null;
  /** 녹음 결과를 업로드한다. `idle`·`retryable`에서만 동작한다. reject하지 않는다. */
  submit: (blob: Blob, mimeType: string) => Promise<UploadResult>;
  /** "다시 제출" — 보관한 같은 Blob으로 재업로드. `retryable`에서만 동작한다. */
  resubmit: () => Promise<UploadResult>;
  /** "다시 녹음" — Blob 폐기 + 안내 지움 + `idle`. `retryable`에서만 동작한다. */
  discardAndRerecord: () => void;
  /** "답변하기"/"다시 시도" 클릭 시 안내 지우기 */
  clearMessage: () => void;
}

interface QuestionTarget {
  key: string;
  sessionId: string;
  questionCode: string;
  sequence: number;
}

interface ActiveRequest {
  id: number;
  target: QuestionTarget;
  controller: AbortController;
  deadlineTimer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
  resolve: (result: UploadResult) => void;
}

interface LocalState {
  questionKey: string | null;
  phase: AnswerUploadPhase;
  message: string | null;
}

const IGNORED_STORE_STATUSES: ReadonlySet<InterviewStatus> = new Set(['FINISHED', 'ERROR', 'IDLE']);

function readCurrentTarget(): QuestionTarget | null {
  const { interviewSessionId, currentQuestionCode, currentSequence } = useInterviewStore.getState();
  const key = getQuestionKey(interviewSessionId, currentQuestionCode, currentSequence);
  if (!key || !interviewSessionId || !currentQuestionCode || currentSequence === null) return null;
  return {
    key,
    sessionId: interviewSessionId,
    questionCode: currentQuestionCode,
    sequence: currentSequence,
  };
}

// ──────────────────────────────────────────────
// 훅
// ──────────────────────────────────────────────

export function useAnswerAudioUpload({
  finishInterview,
  disconnect,
}: UseAnswerAudioUploadOptions): UseAnswerAudioUploadReturn {
  const router = useRouter();
  const currentQuestionKey = useInterviewStore(selectCurrentQuestionKey);

  const [local, setLocal] = useState<LocalState>(() => ({
    questionKey: selectCurrentQuestionKey(useInterviewStore.getState()),
    phase: 'idle',
    message: null,
  }));

  /** 비동기 콜백에서 동기적으로 읽기 위한 local 상태 사본 */
  const localRef = useRef<LocalState>(local);
  const blobRef = useRef<{ blob: Blob; mimeType: string } | null>(null);
  const requestSeqRef = useRef(0);
  const activeRequestRef = useRef<ActiveRequest | null>(null);
  const optionsRef = useRef({ finishInterview, disconnect, router });

  useEffect(() => {
    optionsRef.current = { finishInterview, disconnect, router };
  }, [finishInterview, disconnect, router]);

  const updateLocal = useCallback((next: LocalState) => {
    localRef.current = next;
    setLocal(next);
  }, []);

  /** 현재 질문 키 기준 phase (질문 키가 바뀌었으면 idle) */
  const getPhase = useCallback((): AnswerUploadPhase => {
    const key = selectCurrentQuestionKey(useInterviewStore.getState());
    return localRef.current.questionKey === key ? localRef.current.phase : 'idle';
  }, []);

  const settleRequest = useCallback((request: ActiveRequest, result: UploadResult) => {
    if (request.deadlineTimer) {
      clearTimeout(request.deadlineTimer);
      request.deadlineTimer = null;
    }
    if (request.settled) return;
    request.settled = true;
    request.resolve(result);
  }, []);

  /** 진행 중 요청 ID를 무효화한다(abort하지 않음). 이후 응답은 무시되고 promise는 'none'으로 끝난다. */
  const invalidateActiveRequest = useCallback(() => {
    const request = activeRequestRef.current;
    if (!request) return;
    activeRequestRef.current = null;
    settleRequest(request, 'none');
  }, [settleRequest]);

  // ── 질문 키 변경 초기화 / 답변 수락 동기화 ──
  useEffect(() => {
    const sync = () => {
      const state = useInterviewStore.getState();
      const key = selectCurrentQuestionKey(state);
      const current = localRef.current;

      // 질문 키가 바뀌면 idle로 초기화하고 이전 질문의 Blob·요청을 버린다 (AC4 QUESTION_READY)
      if (current.questionKey !== key) {
        invalidateActiveRequest();
        blobRef.current = null;
        updateLocal({ questionKey: key, phase: 'idle', message: null });
      }

      // 답변 수락 시 동기화: answerAcceptedKey가 현재 질문 키와 같아질 때만 (status SUBSCRIBED만으로는 안 함)
      if (key !== null && state.answerAcceptedKey === key && localRef.current.phase !== 'waiting') {
        invalidateActiveRequest();
        blobRef.current = null;
        updateLocal({ questionKey: key, phase: 'waiting', message: null });
      }
    };

    sync();
    return useInterviewStore.subscribe(sync);
  }, [invalidateActiveRequest, updateLocal]);

  // 언마운트 시 deadline 타이머 정리 + 대기 중 promise 종료
  useEffect(() => invalidateActiveRequest, [invalidateActiveRequest]);

  /** 업로드 응답 적용 규칙: 하나라도 해당하면 결과를 조용히 무시한다. */
  const isApplicable = useCallback(
    (request: ActiveRequest) => {
      if (activeRequestRef.current !== request) return false;
      const state = useInterviewStore.getState();
      if (selectCurrentQuestionKey(state) !== request.target.key) return false;
      if (IGNORED_STORE_STATUSES.has(state.status)) return false;
      return getPhase() === 'uploading';
    },
    [getPhase],
  );

  const handleAuthFailure = useCallback(() => {
    const { disconnect: disconnectSocket, router: currentRouter } = optionsRef.current;
    blobRef.current = null;
    toast.add({ type: 'error', title: ANSWER_UPLOAD_MESSAGES.sessionExpired });
    disconnectSocket();
    useInterviewStore.getState().reset();
    currentRouter.replace('/login');
  }, []);

  const acceptAndWait = useCallback(
    (target: QuestionTarget) => {
      blobRef.current = null;
      updateLocal({ questionKey: target.key, phase: 'waiting', message: null });
      useInterviewStore.getState().setAudioAnswerAccepted({
        sessionId: target.sessionId,
        questionCode: target.questionCode,
        sequence: target.sequence,
      });
    },
    [updateLocal],
  );

  const startRequest = useCallback(
    (target: QuestionTarget, recording: { blob: Blob; mimeType: string }) =>
      new Promise<UploadResult>((resolve) => {
        const request: ActiveRequest = {
          id: ++requestSeqRef.current,
          target,
          controller: new AbortController(),
          deadlineTimer: null,
          settled: false,
          resolve,
        };
        activeRequestRef.current = request;
        updateLocal({ questionKey: target.key, phase: 'uploading', message: null });

        // 35초 deadline: apiRequest 완료를 기다리지 않고 즉시 retryable로 바꾼다 (AC10)
        request.deadlineTimer = setTimeout(() => {
          request.deadlineTimer = null;
          if (activeRequestRef.current !== request || getPhase() !== 'uploading') return;
          activeRequestRef.current = null;
          request.controller.abort();
          updateLocal({
            questionKey: target.key,
            phase: 'retryable',
            message: ANSWER_UPLOAD_MESSAGES.network,
          });
          settleRequest(request, 'none');
        }, ANSWER_UPLOAD_DEADLINE_MS);

        let file: File;
        try {
          file = createAnswerAudioFile(recording.blob, recording.mimeType);
        } catch {
          activeRequestRef.current = null;
          updateLocal({
            questionKey: target.key,
            phase: 'retryable',
            message: ANSWER_UPLOAD_MESSAGES.network,
          });
          settleRequest(request, 'none');
          return;
        }

        submitInterviewAnswerAudio(target.sessionId, {
          questionCode: target.questionCode,
          sequence: target.sequence,
          file,
          signal: request.controller.signal,
        }).then(
          () => {
            if (!isApplicable(request)) {
              if (activeRequestRef.current === request) activeRequestRef.current = null;
              settleRequest(request, 'none');
              return;
            }
            activeRequestRef.current = null;
            acceptAndWait(target);
            settleRequest(request, 'none');
          },
          (error: unknown) => {
            if (!isApplicable(request)) {
              if (activeRequestRef.current === request) activeRequestRef.current = null;
              settleRequest(request, 'none');
              return;
            }
            activeRequestRef.current = null;

            const outcome = classifyUploadError(error);
            switch (outcome.kind) {
              case 'auth':
                updateLocal({ questionKey: target.key, phase: 'idle', message: null });
                settleRequest(request, 'none');
                handleAuthFailure();
                return;
              case 'rerecord':
                blobRef.current = null;
                updateLocal({ questionKey: target.key, phase: 'idle', message: outcome.message });
                settleRequest(request, 'rerecord-required');
                return;
              case 'finished':
                blobRef.current = null;
                updateLocal({ questionKey: target.key, phase: 'waiting', message: null });
                settleRequest(request, 'none');
                optionsRef.current.finishInterview(target.sessionId);
                return;
              case 'accepted':
                acceptAndWait(target);
                settleRequest(request, 'none');
                return;
              case 'retryable':
                updateLocal({
                  questionKey: target.key,
                  phase: 'retryable',
                  message: outcome.message,
                });
                settleRequest(request, 'none');
                return;
            }
          },
        );
      }),
    [acceptAndWait, getPhase, handleAuthFailure, isApplicable, settleRequest, updateLocal],
  );

  const submit = useCallback(
    (blob: Blob, mimeType: string): Promise<UploadResult> => {
      const phase = getPhase();
      if (phase === 'uploading' || phase === 'waiting') return Promise.resolve('none');

      const target = readCurrentTarget();
      if (!target) return Promise.resolve('none');
      if (IGNORED_STORE_STATUSES.has(useInterviewStore.getState().status)) {
        return Promise.resolve('none');
      }
      // 답변이 이미 수락된 질문이면 업로드하지 않는다.
      // 보통은 sync effect가 phase를 'waiting'으로 바꿔 위에서 먼저 반환된다.
      // 이 분기는 store 갱신 직후 sync 이전 경계에서의 중복 방어다.
      if (useInterviewStore.getState().answerAcceptedKey === target.key) {
        return Promise.resolve('none');
      }

      const recording = { blob, mimeType };
      blobRef.current = recording;
      return startRequest(target, recording);
    },
    [getPhase, startRequest],
  );

  const resubmit = useCallback((): Promise<UploadResult> => {
    if (getPhase() !== 'retryable') return Promise.resolve('none');

    const recording = blobRef.current;
    const target = readCurrentTarget();
    if (!recording || !target) return Promise.resolve('none');
    if (IGNORED_STORE_STATUSES.has(useInterviewStore.getState().status)) {
      return Promise.resolve('none');
    }

    return startRequest(target, recording);
  }, [getPhase, startRequest]);

  const discardAndRerecord = useCallback(() => {
    if (getPhase() !== 'retryable') return;
    blobRef.current = null;
    updateLocal({
      questionKey: selectCurrentQuestionKey(useInterviewStore.getState()),
      phase: 'idle',
      message: null,
    });
  }, [getPhase, updateLocal]);

  const clearMessage = useCallback(() => {
    if (localRef.current.message === null) return;
    updateLocal({ ...localRef.current, message: null });
  }, [updateLocal]);

  const isCurrentKey = local.questionKey === currentQuestionKey;

  return {
    phase: isCurrentKey ? local.phase : 'idle',
    message: isCurrentKey ? local.message : null,
    submit,
    resubmit,
    discardAndRerecord,
    clearMessage,
  };
}
