import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, REISSUE_FAILED_MESSAGE } from '@/lib/api-client';
import { submitInterviewAnswerAudio } from '@/lib/interview-api';
import { useInterviewStore, type QuestionReadyPayload } from '@/store/interview-store';
import { useToastStore } from '@/store/toast-store';

import {
  ANSWER_UPLOAD_DEADLINE_MS,
  ANSWER_UPLOAD_MESSAGES,
  classifyUploadError,
  useAnswerAudioUpload,
  type UploadResult,
} from '../use-answer-audio-upload';

const routerReplace = vi.fn();
const router = { replace: routerReplace, push: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/lib/interview-api', () => ({
  submitInterviewAnswerAudio: vi.fn(),
}));

const submitMock = vi.mocked(submitInterviewAnswerAudio);

// ──────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────

interface Deferred {
  resolve: () => void;
  reject: (error: unknown) => void;
  signal: AbortSignal | undefined;
  file: File;
  questionCode: string;
  sequence: number;
}

let pending: Deferred[] = [];

function successResponse() {
  return {
    status: 'OK',
    code: 200,
    data: {
      interview_session_id: 'session-1',
      status: 'WAITING_FOR_QUESTION',
      question_code: 'S_001',
      sequence: 1,
    },
    message: 'OK',
  };
}

function question(sequence: number, questionCode = `S_00${sequence}`): QuestionReadyPayload {
  return {
    type: 'QUESTION_READY',
    interview_session_id: 'session-1',
    status: 'QUESTION_READY',
    question_code: questionCode,
    sequence,
    question: `${sequence}번 질문`,
    message: null,
    audio_url: null,
    audio_status: null,
  };
}

function startInterview() {
  const store = useInterviewStore.getState();
  store.setSessionStarted('session-1');
  store.setQuestion(question(1));
}

function renderUploadHook() {
  const finishInterview = vi.fn((sessionId: string) =>
    useInterviewStore.getState().setFinished(sessionId),
  );
  const disconnect = vi.fn();
  const hook = renderHook(() => useAnswerAudioUpload({ finishInterview, disconnect }));
  return { ...hook, finishInterview, disconnect };
}

const blob = () => new Blob([new Uint8Array(16)], { type: 'audio/webm;codecs=opus' });

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function apiError(status: number, apiStatus?: string, options?: { isReissueFailure?: boolean }) {
  return new ApiError('error', status, apiStatus, status, options);
}

beforeEach(() => {
  pending = [];
  submitMock.mockReset();
  submitMock.mockImplementation(
    (_sessionId, { questionCode, sequence, file, signal }) =>
      new Promise((resolve, reject) => {
        pending.push({
          resolve: () => resolve(successResponse()),
          reject,
          signal,
          file,
          questionCode,
          sequence,
        });
      }),
  );
  routerReplace.mockReset();
  useToastStore.setState({ toasts: [] });
  startInterview();
});

afterEach(() => {
  useInterviewStore.getState().reset();
  vi.useRealTimers();
});

// ──────────────────────────────────────────────
// classifyUploadError
// ──────────────────────────────────────────────

describe('classifyUploadError (업로드 오류 판정 순서)', () => {
  it.each([
    [
      new TypeError('Failed to fetch'),
      { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.network },
    ],
    [
      new DOMException('aborted', 'AbortError'),
      { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.network },
    ],
    [apiError(401), { kind: 'auth' }],
    [apiError(403, undefined, { isReissueFailure: true }), { kind: 'auth' }],
    [new ApiError(REISSUE_FAILED_MESSAGE, 500), { kind: 'auth' }],
    [
      apiError(400, 'INTERVIEW_ANSWER_TOO_LONG'),
      { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.tooLong },
    ],
    [
      apiError(400, 'INTERVIEW_ANSWER_AUDIO_INVALID'),
      { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.audioInvalid },
    ],
    [apiError(400), { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.audioInvalid }],
    [apiError(413), { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.tooLarge }],
    [
      apiError(422, 'INTERVIEW_ANSWER_NOT_RECOGNIZED'),
      { kind: 'rerecord', message: ANSWER_UPLOAD_MESSAGES.notRecognized },
    ],
    [apiError(409, 'INTERVIEW_ALREADY_COMPLETED'), { kind: 'finished' }],
    [apiError(409, 'INTERVIEW_QUESTION_NOT_READY'), { kind: 'accepted' }],
    [apiError(409), { kind: 'accepted' }],
    [apiError(429), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.rateLimited }],
    [apiError(502), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.transcriptionFailed }],
    [apiError(500), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.serverError }],
    [apiError(503), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.serverError }],
    [apiError(403), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.clientError }],
    [apiError(404), { kind: 'retryable', message: ANSWER_UPLOAD_MESSAGES.clientError }],
  ])('%s → %o', (error, expected) => {
    expect(classifyUploadError(error)).toEqual(expected);
  });
});

// ──────────────────────────────────────────────
// useAnswerAudioUpload
// ──────────────────────────────────────────────

describe('useAnswerAudioUpload — 업로드 요청', () => {
  it('submit 시 uploading이 되고 기본 MIME File과 질문 키를 담아 요청한다', async () => {
    const { result } = renderUploadHook();
    expect(result.current.phase).toBe('idle');

    act(() => {
      void result.current.submit(blob(), 'audio/webm;codecs=opus');
    });

    expect(result.current.phase).toBe('uploading');
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock.mock.calls[0][0]).toBe('session-1');
    const [request] = pending;
    expect(request.questionCode).toBe('S_001');
    expect(request.sequence).toBe(1);
    expect(request.file.name).toBe('answer.webm');
    expect(request.file.type).toBe('audio/webm');
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(useInterviewStore.getState().status).toBe('QUESTION');
  });

  it('uploading 중 추가 submit은 무시하고 none을 반환한다', async () => {
    const { result } = renderUploadHook();

    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    let second: UploadResult | undefined;
    await act(async () => {
      second = await result.current.submit(blob(), 'audio/webm');
    });

    expect(second).toBe('none');
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('200이면 waiting으로 바뀌고 setAudioAnswerAccepted로 answerAcceptedKey를 기록한다', async () => {
    const { result } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });

    pending[0].resolve();
    await expect(promise).resolves.toBe('none');
    await flush();

    expect(result.current.phase).toBe('waiting');
    expect(useInterviewStore.getState().status).toBe('SUBSCRIBED');
    expect(useInterviewStore.getState().answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('RECONNECTING 중 200이면 store는 no-op이지만 phase는 waiting (검증 시나리오 3)', async () => {
    const { result } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      useInterviewStore.getState().setStatus('RECONNECTING');
    });

    pending[0].resolve();
    await promise;
    await flush();

    expect(result.current.phase).toBe('waiting');
    expect(useInterviewStore.getState().answerAcceptedKey).toBeNull();

    // 재연결 후 QUESTION으로 복구되어도 phase waiting 유지
    act(() => {
      useInterviewStore.getState().setStatus('QUESTION');
    });
    expect(result.current.phase).toBe('waiting');
  });
});

describe('useAnswerAudioUpload — 오류 처리', () => {
  async function submitAndReject(error: unknown) {
    const hook = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = hook.result.current.submit(blob(), 'audio/webm');
    });
    pending[0].reject(error);
    let uploadResult: UploadResult | undefined;
    await act(async () => {
      uploadResult = await promise;
    });
    return { ...hook, uploadResult };
  }

  it('AC6 400 TOO_LONG → idle + 전용 문구 + rerecord-required', async () => {
    const { result, uploadResult } = await submitAndReject(
      apiError(400, 'INTERVIEW_ANSWER_TOO_LONG'),
    );

    expect(uploadResult).toBe('rerecord-required');
    expect(result.current.phase).toBe('idle');
    expect(result.current.message).toBe(ANSWER_UPLOAD_MESSAGES.tooLong);
  });

  it('AC6 이후 resubmit은 Blob이 없어 동작하지 않는다', async () => {
    const { result } = await submitAndReject(apiError(422));

    let resubmitResult: UploadResult | undefined;
    await act(async () => {
      resubmitResult = await result.current.resubmit();
    });

    expect(resubmitResult).toBe('none');
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('AC7 409 NOT_READY → waiting + setAudioAnswerAccepted', async () => {
    const { result, uploadResult } = await submitAndReject(
      apiError(409, 'INTERVIEW_QUESTION_NOT_READY'),
    );

    expect(uploadResult).toBe('none');
    expect(result.current.phase).toBe('waiting');
    expect(useInterviewStore.getState().answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('AC7 409 ALREADY_COMPLETED → finishInterview(sessionId) 호출', async () => {
    const { finishInterview } = await submitAndReject(apiError(409, 'INTERVIEW_ALREADY_COMPLETED'));

    expect(finishInterview).toHaveBeenCalledWith('session-1');
    expect(useInterviewStore.getState().status).toBe('FINISHED');
    expect(useInterviewStore.getState().interviewSessionId).toBe('session-1');
  });

  it('AC7 store가 이미 ERROR면 409 ALREADY_COMPLETED를 무시한다', async () => {
    const hook = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = hook.result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      useInterviewStore.getState().setError('연결 오류');
    });
    pending[0].reject(apiError(409, 'INTERVIEW_ALREADY_COMPLETED'));
    await act(async () => {
      await promise;
    });

    expect(hook.finishInterview).not.toHaveBeenCalled();
    expect(useInterviewStore.getState().status).toBe('ERROR');
  });

  it.each([
    [apiError(429), ANSWER_UPLOAD_MESSAGES.rateLimited],
    [apiError(502), ANSWER_UPLOAD_MESSAGES.transcriptionFailed],
    [apiError(500), ANSWER_UPLOAD_MESSAGES.serverError],
    [apiError(403), ANSWER_UPLOAD_MESSAGES.clientError],
    [new TypeError('Failed to fetch'), ANSWER_UPLOAD_MESSAGES.network],
  ])('%s → retryable + 안내', async (error, message) => {
    const { result, uploadResult } = await submitAndReject(error);

    expect(uploadResult).toBe('none');
    expect(result.current.phase).toBe('retryable');
    expect(result.current.message).toBe(message);
  });

  it('retryable에서 resubmit은 같은 Blob과 새 AbortController로 재요청한다 (AC9 반복)', async () => {
    const { result } = await submitAndReject(apiError(502));

    act(() => {
      void result.current.resubmit();
    });
    expect(result.current.phase).toBe('uploading');
    expect(result.current.message).toBeNull();
    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(pending[1].signal).not.toBe(pending[0].signal);
    expect(pending[1].file.size).toBe(pending[0].file.size);

    pending[1].reject(apiError(502));
    await flush();
    expect(result.current.phase).toBe('retryable');
  });

  it('discardAndRerecord는 retryable에서만 idle로 바꾸고 Blob을 버린다', async () => {
    const { result } = await submitAndReject(apiError(429));

    act(() => {
      result.current.discardAndRerecord();
    });

    expect(result.current.phase).toBe('idle');
    expect(result.current.message).toBeNull();

    let resubmitResult: UploadResult | undefined;
    await act(async () => {
      resubmitResult = await result.current.resubmit();
    });
    expect(resubmitResult).toBe('none');
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('clearMessage는 안내만 지운다', async () => {
    const { result } = await submitAndReject(apiError(422));

    act(() => {
      result.current.clearMessage();
    });

    expect(result.current.message).toBeNull();
    expect(result.current.phase).toBe('idle');
  });

  it.each([
    ['재시도 401', apiError(401)],
    [
      '재발급 실패',
      new ApiError(REISSUE_FAILED_MESSAGE, 403, undefined, undefined, { isReissueFailure: true }),
    ],
  ])('AC12 %s → 토스트 + disconnect + reset + /login', async (_, error) => {
    const { disconnect, uploadResult } = await submitAndReject(error);

    expect(uploadResult).toBe('none');
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ type: 'error', title: ANSWER_UPLOAD_MESSAGES.sessionExpired }),
    ]);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(useInterviewStore.getState().status).toBe('IDLE');
    expect(routerReplace).toHaveBeenCalledWith('/login');
  });
});

describe('useAnswerAudioUpload — 35초 deadline (AC10)', () => {
  it('35초가 지나면 즉시 abort + retryable, 이후 도착한 응답은 무시한다', async () => {
    vi.useFakeTimers();
    const { result, disconnect } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });

    act(() => {
      vi.advanceTimersByTime(ANSWER_UPLOAD_DEADLINE_MS - 1);
    });
    expect(result.current.phase).toBe('uploading');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('retryable');
    expect(result.current.message).toBe(ANSWER_UPLOAD_MESSAGES.network);
    expect(pending[0].signal?.aborted).toBe(true);
    await expect(promise).resolves.toBe('none');

    // 이후 재발급 후 재시도 결과(성공·인증 실패)가 와도 화면이 바뀌지 않는다
    pending[0].reject(apiError(401));
    await flush();
    expect(result.current.phase).toBe('retryable');
    expect(disconnect).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('deadline 만료 후 resubmit은 새 signal로 요청한다', async () => {
    vi.useFakeTimers();
    const { result } = renderUploadHook();
    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      vi.advanceTimersByTime(ANSWER_UPLOAD_DEADLINE_MS);
    });

    act(() => {
      void result.current.resubmit();
    });

    expect(pending[1].signal?.aborted).toBe(false);
    pending[1].resolve();
    await flush();
    expect(result.current.phase).toBe('waiting');
  });

  it('deadline 안에 응답이 오면 타이머를 정리한다', async () => {
    vi.useFakeTimers();
    const { result } = renderUploadHook();
    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    pending[0].reject(apiError(502));
    await flush();

    act(() => {
      vi.advanceTimersByTime(ANSWER_UPLOAD_DEADLINE_MS);
    });
    expect(result.current.message).toBe(ANSWER_UPLOAD_MESSAGES.transcriptionFailed);
    expect(pending[0].signal?.aborted).toBe(false);
  });
});

describe('useAnswerAudioUpload — 상태 충돌 (검증 시나리오)', () => {
  it('1. 200보다 ANSWER_ACCEPTED가 먼저 오면 waiting이 되고 뒤이은 200은 무시된다', async () => {
    const { result } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });

    act(() => {
      useInterviewStore
        .getState()
        .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });
    });
    expect(result.current.phase).toBe('waiting');
    await expect(promise).resolves.toBe('none');
    // 진행 중 요청은 abort하지 않는다
    expect(pending[0].signal?.aborted).toBe(false);

    pending[0].resolve();
    await flush();
    expect(result.current.phase).toBe('waiting');
  });

  it('2. 타임아웃 retryable 뒤 ANSWER_ACCEPTED가 오면 waiting + Blob 폐기', async () => {
    vi.useFakeTimers();
    const { result } = renderUploadHook();
    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      vi.advanceTimersByTime(ANSWER_UPLOAD_DEADLINE_MS);
    });
    expect(result.current.phase).toBe('retryable');

    act(() => {
      useInterviewStore
        .getState()
        .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });
    });

    expect(result.current.phase).toBe('waiting');
    expect(result.current.message).toBeNull();
    let resubmitResult: UploadResult | undefined;
    await act(async () => {
      resubmitResult = await result.current.resubmit();
    });
    expect(resubmitResult).toBe('none');
  });

  it('4. retryable에서 재연결(RECONNECTING → QUESTION)해도 phase와 Blob이 유지된다', async () => {
    const { result } = renderUploadHook();
    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    pending[0].reject(apiError(502));
    await flush();

    act(() => {
      useInterviewStore.getState().setStatus('RECONNECTING');
    });
    act(() => {
      useInterviewStore.getState().setStatus('QUESTION');
    });

    expect(result.current.phase).toBe('retryable');
    act(() => {
      void result.current.resubmit();
    });
    expect(submitMock).toHaveBeenCalledTimes(2);
  });

  it('재연결로 status만 SUBSCRIBED가 되면 동기화하지 않는다', async () => {
    const { result } = renderUploadHook();
    act(() => {
      void result.current.submit(blob(), 'audio/webm');
    });
    pending[0].reject(apiError(429));
    await flush();

    act(() => {
      useInterviewStore.getState().setStatus('SUBSCRIBED');
    });

    expect(result.current.phase).toBe('retryable');
  });

  it('idle(녹음 중)에서 ANSWER_ACCEPTED가 오면 waiting이 된다', () => {
    const { result } = renderUploadHook();

    act(() => {
      useInterviewStore
        .getState()
        .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });
    });

    expect(result.current.phase).toBe('waiting');
  });

  it('QUESTION_READY로 질문 키가 바뀌면 idle로 초기화하고 이전 응답을 무시한다', async () => {
    const { result } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });

    act(() => {
      useInterviewStore.getState().setQuestion(question(2));
    });
    expect(result.current.phase).toBe('idle');
    await expect(promise).resolves.toBe('none');

    pending[0].reject(apiError(422));
    await flush();
    expect(result.current.phase).toBe('idle');
    expect(result.current.message).toBeNull();
  });

  it('INTERVIEW_FINISHED 이후 도착한 응답은 무시한다', async () => {
    const { result, finishInterview } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      useInterviewStore.getState().setFinished('session-1');
    });

    pending[0].reject(apiError(409, 'INTERVIEW_ALREADY_COMPLETED'));
    await expect(promise).resolves.toBe('none');
    expect(finishInterview).not.toHaveBeenCalled();
  });

  it('reset 이후 도착한 인증 실패는 무시한다', async () => {
    const { result, disconnect } = renderUploadHook();
    let promise!: Promise<UploadResult>;
    act(() => {
      promise = result.current.submit(blob(), 'audio/webm');
    });
    act(() => {
      useInterviewStore.getState().reset();
    });

    pending[0].reject(apiError(401));
    await expect(promise).resolves.toBe('none');
    expect(disconnect).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
