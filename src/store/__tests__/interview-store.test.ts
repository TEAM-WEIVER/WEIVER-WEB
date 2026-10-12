import { afterEach, describe, expect, it } from 'vitest';

import { getQuestionKey, getRoundLabel, useInterviewStore } from '../interview-store';
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

  it('lastReceivedKey가 질문 키("sessionId:question_code:sequence") 형식으로 기록된다', () => {
    const payload = makeQuestionPayload({
      interview_session_id: 'session-abc',
      question_code: 'S_005',
      sequence: 5,
    });

    useInterviewStore.getState().setQuestion(payload);

    expect(useInterviewStore.getState().lastReceivedKey).toBe('session-abc:S_005:5');
  });

  it('같은 sequence라도 question_code가 다르면 새 질문으로 반영한다', () => {
    const store = useInterviewStore.getState();
    store.setQuestion(makeQuestionPayload({ question_code: 'S_001', sequence: 1, question: 'A' }));
    store.setQuestion(makeQuestionPayload({ question_code: 'C_001', sequence: 1, question: 'B' }));

    const state = useInterviewStore.getState();
    expect(state.currentQuestionCode).toBe('C_001');
    expect(state.currentQuestion).toBe('B');
  });

  it('활성 세션과 다른 세션의 QUESTION_READY는 무시한다', () => {
    const store = useInterviewStore.getState();
    store.setSessionStarted('session-1');
    store.setQuestion(makeQuestionPayload({ interview_session_id: 'session-1', question: '현재' }));

    store.setQuestion(
      makeQuestionPayload({ interview_session_id: 'session-other', sequence: 9, question: '남' }),
    );

    const state = useInterviewStore.getState();
    expect(state.interviewSessionId).toBe('session-1');
    expect(state.currentQuestion).toBe('현재');
  });

  it('활성 세션을 모르면(SESSION_STARTED 전) 세션 비교 없이 반영한다', () => {
    useInterviewStore
      .getState()
      .setQuestion(makeQuestionPayload({ interview_session_id: 'session-x', question: 'Q' }));

    expect(useInterviewStore.getState().currentQuestion).toBe('Q');
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
    expect(state.answerAcceptedKey).toBeNull();
  });
});

// ──────────────────────────────────────────────
// #119 질문 키 / 답변 수락
// ──────────────────────────────────────────────

function startQuestion(overrides: Partial<QuestionReadyPayload> = {}) {
  const store = useInterviewStore.getState();
  store.setSessionStarted(overrides.interview_session_id ?? 'session-1');
  store.setQuestion(makeQuestionPayload(overrides));
}

describe('getQuestionKey', () => {
  it('세션·질문 코드·sequence를 조합한다', () => {
    expect(getQuestionKey('session-1', 'S_001', 2)).toBe('session-1:S_001:2');
  });

  it('하나라도 없으면 null을 반환한다', () => {
    expect(getQuestionKey(null, 'S_001', 1)).toBeNull();
    expect(getQuestionKey('session-1', null, 1)).toBeNull();
    expect(getQuestionKey('session-1', 'S_001', null)).toBeNull();
  });
});

describe('setAnswerAccepted (#119 AC4)', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('현재 질문과 일치하면 SUBSCRIBED로 바뀌고 answerAcceptedKey를 기록한다', () => {
    startQuestion();

    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('SUBSCRIBED');
    expect(state.answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('SUBMITTING 상태에서도 전이한다', () => {
    startQuestion();
    useInterviewStore.getState().setStatus('SUBMITTING');

    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    expect(useInterviewStore.getState().status).toBe('SUBSCRIBED');
  });

  it('question_code·sequence가 null이면 해당 비교를 생략한다', () => {
    startQuestion();

    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: null, sequence: null });

    expect(useInterviewStore.getState().answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('question_code·sequence 필드가 없으면(undefined) 해당 비교를 생략한다', () => {
    startQuestion();

    useInterviewStore.getState().setAnswerAccepted({ sessionId: 'session-1' });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('SUBSCRIBED');
    expect(state.answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('필드가 하나만 있으면 있는 필드만 비교한다', () => {
    startQuestion();

    useInterviewStore.getState().setAnswerAccepted({ sessionId: 'session-1', sequence: 2 });
    expect(useInterviewStore.getState().status).toBe('QUESTION');

    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001' });
    expect(useInterviewStore.getState().status).toBe('SUBSCRIBED');
  });

  it.each([
    ['다른 세션', { sessionId: 'session-2', questionCode: 'S_001', sequence: 1 }],
    ['다른 질문 코드', { sessionId: 'session-1', questionCode: 'S_002', sequence: 1 }],
    ['이전 sequence', { sessionId: 'session-1', questionCode: 'S_001', sequence: 0 }],
  ])('%s의 수락은 무시하고 키를 기록하지 않는다', (_, params) => {
    startQuestion();

    useInterviewStore.getState().setAnswerAccepted(params);

    const state = useInterviewStore.getState();
    expect(state.status).toBe('QUESTION');
    expect(state.answerAcceptedKey).toBeNull();
  });

  it.each(['RECONNECTING', 'SUBSCRIBED', 'FINISHED', 'ERROR'] as const)(
    'status가 %s이면 무시한다',
    (status) => {
      startQuestion();
      useInterviewStore.getState().setStatus(status);

      useInterviewStore
        .getState()
        .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

      const state = useInterviewStore.getState();
      expect(state.status).toBe(status);
      expect(state.answerAcceptedKey).toBeNull();
    },
  );

  it('reset 후에는 이전 세션 메시지가 무시된다', () => {
    startQuestion();
    useInterviewStore.getState().reset();

    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: null, sequence: null });

    expect(useInterviewStore.getState().status).toBe('IDLE');
  });

  it('다음 질문을 받으면 이전 answerAcceptedKey는 현재 질문 키와 일치하지 않는다', () => {
    startQuestion();
    useInterviewStore
      .getState()
      .setAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    useInterviewStore
      .getState()
      .setQuestion(makeQuestionPayload({ question_code: 'S_002', sequence: 2 }));

    const state = useInterviewStore.getState();
    expect(state.status).toBe('QUESTION');
    expect(state.answerAcceptedKey).not.toBe(
      getQuestionKey(state.interviewSessionId, state.currentQuestionCode, state.currentSequence),
    );
  });
});

describe('setAudioAnswerAccepted (#119 AC2/AC7)', () => {
  afterEach(() => {
    useInterviewStore.getState().reset();
  });

  it('요청 질문 키가 현재 질문 키와 같고 QUESTION이면 SUBSCRIBED + 키 기록', () => {
    startQuestion();

    useInterviewStore
      .getState()
      .setAudioAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('SUBSCRIBED');
    expect(state.answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('RECONNECTING이면 no-op이고 키를 기록하지 않는다 (검증 시나리오 3)', () => {
    startQuestion();
    useInterviewStore.getState().setStatus('RECONNECTING');

    useInterviewStore
      .getState()
      .setAudioAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('RECONNECTING');
    expect(state.answerAcceptedKey).toBeNull();
  });

  it('질문 키가 다르면 no-op', () => {
    startQuestion({ sequence: 2 });

    useInterviewStore
      .getState()
      .setAudioAnswerAccepted({ sessionId: 'session-1', questionCode: 'S_001', sequence: 1 });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('QUESTION');
    expect(state.answerAcceptedKey).toBeNull();
  });
});
