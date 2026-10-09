import { afterEach, describe, expect, it } from 'vitest';

import { getRoundLabel, useInterviewStore } from '../interview-store';
import type { QuestionReadyPayload } from '../interview-store';

// ──────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────

function makeQuestionPayload(overrides: Partial<QuestionReadyPayload> = {}): QuestionReadyPayload {
  return {
    type: 'QUESTION_READY',
    interview_session_id: 'session-1',
    status: 'QUESTION_READY',
    question_code: 'S_001',
    sequence: 1,
    question: '자기소개를 해주세요.',
    message: null,
    audio_url: 'https://cdn.example.com/audio/q1.mp3',
    audio_status: 'READY',
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// getRoundLabel
// ──────────────────────────────────────────────

describe('getRoundLabel', () => {
  it('questionCode가 null이면 "면접"을 반환한다', () => {
    expect(getRoundLabel(null)).toBe('면접');
  });

  it('"S_" prefix이면 "1차 면접 - 기술 면접"을 반환한다', () => {
    expect(getRoundLabel('S_001')).toBe('1차 면접 - 기술 면접');
    expect(getRoundLabel('S_')).toBe('1차 면접 - 기술 면접');
  });

  it('"C_" prefix이면 "2차 면접 - 인성 면접"을 반환한다', () => {
    expect(getRoundLabel('C_001')).toBe('2차 면접 - 인성 면접');
    expect(getRoundLabel('C_')).toBe('2차 면접 - 인성 면접');
  });

  it('알 수 없는 prefix이면 "면접"을 반환한다', () => {
    expect(getRoundLabel('X_001')).toBe('면접');
    expect(getRoundLabel('unknown')).toBe('면접');
  });
});

// ──────────────────────────────────────────────
// setQuestion — 중복/역행 방어
// ──────────────────────────────────────────────

describe('setQuestion — 중복/역행 방어', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('동일 lastReceivedKey로 재호출 시 상태가 변경되지 않는다', () => {
    const store = useInterviewStore.getState();
    const payload = makeQuestionPayload();

    store.setQuestion(payload);
    const stateBefore = { ...useInterviewStore.getState() };

    // 동일 payload로 재호출
    store.setQuestion(payload);
    const stateAfter = useInterviewStore.getState();

    expect(stateAfter.currentQuestion).toBe(stateBefore.currentQuestion);
    expect(stateAfter.currentSequence).toBe(stateBefore.currentSequence);
    expect(stateAfter.lastReceivedKey).toBe(stateBefore.lastReceivedKey);
  });

  it('역행 sequence(payload.sequence < currentSequence) 호출은 무시된다', () => {
    const store = useInterviewStore.getState();

    // sequence 3 먼저 수신
    store.setQuestion(makeQuestionPayload({ sequence: 3, question: '3번 질문' }));
    expect(useInterviewStore.getState().currentSequence).toBe(3);

    // sequence 2 역행 수신 — 무시되어야 함
    store.setQuestion(makeQuestionPayload({ sequence: 2, question: '2번 질문' }));
    const state = useInterviewStore.getState();
    expect(state.currentSequence).toBe(3);
    expect(state.currentQuestion).toBe('3번 질문');
  });
});

// ──────────────────────────────────────────────
// setQuestion — 정상 경로
// ──────────────────────────────────────────────

describe('setQuestion — 정상 경로', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('status가 "QUESTION"으로 전환된다', () => {
    useInterviewStore.getState().setQuestion(makeQuestionPayload());
    expect(useInterviewStore.getState().status).toBe('QUESTION');
  });

  it('currentAudioUrl과 currentAudioStatus가 저장된다', () => {
    const payload = makeQuestionPayload({
      audio_url: 'https://cdn.example.com/audio/q1.mp3',
      audio_status: 'READY',
    });

    useInterviewStore.getState().setQuestion(payload);
    const state = useInterviewStore.getState();

    expect(state.currentAudioUrl).toBe('https://cdn.example.com/audio/q1.mp3');
    expect(state.currentAudioStatus).toBe('READY');
  });

  it('audio_status가 null이어도 currentAudioStatus에 null로 저장된다', () => {
    const payload = makeQuestionPayload({ audio_url: null, audio_status: null });

    useInterviewStore.getState().setQuestion(payload);
    const state = useInterviewStore.getState();

    expect(state.currentAudioUrl).toBeNull();
    expect(state.currentAudioStatus).toBeNull();
  });

  it('audio_status가 "UNAVAILABLE"이면 그대로 저장된다', () => {
    const payload = makeQuestionPayload({ audio_url: null, audio_status: 'UNAVAILABLE' });

    useInterviewStore.getState().setQuestion(payload);

    expect(useInterviewStore.getState().currentAudioStatus).toBe('UNAVAILABLE');
  });

  it('lastReceivedKey가 "sessionId:sequence" 형식으로 기록된다', () => {
    const payload = makeQuestionPayload({ interview_session_id: 'session-abc', sequence: 5 });

    useInterviewStore.getState().setQuestion(payload);

    expect(useInterviewStore.getState().lastReceivedKey).toBe('session-abc:5');
  });
});

// ──────────────────────────────────────────────
// setFinished
// ──────────────────────────────────────────────

describe('setFinished', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('sessionId가 불일치하면 false를 반환하고 상태가 변경되지 않는다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1' }));

    const result = store.setFinished('session-999');
    const state = useInterviewStore.getState();

    expect(result).toBe(false);
    expect(state.status).toBe('QUESTION');
    expect(state.currentQuestion).not.toBeNull();
  });

  it('sessionId가 일치하면 true를 반환하고 status가 "FINISHED"로 전환된다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1' }));

    const result = store.setFinished('session-1');
    const state = useInterviewStore.getState();

    expect(result).toBe(true);
    expect(state.status).toBe('FINISHED');
  });

  it('setFinished 후 currentQuestion과 lastReceivedKey가 null로 초기화된다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1' }));

    store.setFinished('session-1');
    const state = useInterviewStore.getState();

    expect(state.currentQuestion).toBeNull();
    expect(state.lastReceivedKey).toBeNull();
  });

  it('setFinished 후 interviewSessionId는 보존된다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1' }));

    store.setFinished('session-1');

    expect(useInterviewStore.getState().interviewSessionId).toBe('session-1');
  });
});

// ──────────────────────────────────────────────
// reset
// ──────────────────────────────────────────────

describe('reset', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('reset 호출 시 initialState로 완전 초기화된다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1' }));
    store.setError('네트워크 오류');

    store.reset();
    const state = useInterviewStore.getState();

    expect(state.status).toBe('IDLE');
    expect(state.interviewSessionId).toBeNull();
    expect(state.currentQuestion).toBeNull();
    expect(state.currentQuestionCode).toBeNull();
    expect(state.currentSequence).toBeNull();
    expect(state.currentAudioUrl).toBeNull();
    expect(state.currentAudioStatus).toBeNull();
    expect(state.errorMessage).toBeNull();
    expect(state.lastReceivedKey).toBeNull();
  });
});
