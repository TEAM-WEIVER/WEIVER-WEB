import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInterviewStore, type InterviewStatus } from '@/store/interview-store';

import { normalizeBrokerUrl, useInterviewWebSocket } from '../use-interview-websocket';

const routerReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
}));

interface FakeFrame {
  headers: Record<string, string>;
  body: string;
}

interface FakeClientConfig {
  brokerURL: string;
  connectHeaders: Record<string, string>;
  reconnectDelay: number;
  onConnect: () => void;
  onStompError: (frame: FakeFrame) => void;
  onWebSocketClose: () => void;
  onWebSocketError: () => void;
}

const clients: FakeClient[] = [];

class FakeClient {
  active = false;
  connected = false;
  activate = vi.fn(() => {
    this.active = true;
  });
  deactivate = vi.fn(async () => {
    this.active = false;
    this.connected = false;
  });
  publish = vi.fn();
  receiptCallbacks = new Map<string, () => void>();
  watchForReceipt = vi.fn((id: string, callback: () => void) => {
    this.receiptCallbacks.set(id, callback);
  });
  handler: ((msg: { body: string }) => void) | null = null;
  subscribe = vi.fn(
    (
      _dest: string,
      handler: (msg: { body: string }) => void,
      _headers?: Record<string, string>,
    ) => {
      this.handler = handler;
    },
  );

  constructor(public config: FakeClientConfig) {
    clients.push(this);
  }

  /** stompjs: onConnect 직전에 connected가 true가 된다 */
  connect() {
    this.connected = true;
    this.config.onConnect();
  }

  fireReceipt() {
    const headers = this.subscribe.mock.calls.at(-1)?.[2];
    const id = headers?.receipt;
    if (id) this.receiptCallbacks.get(id)?.();
  }
}

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(function (this: unknown, config: FakeClientConfig) {
    return new FakeClient(config);
  }),
}));

function send(client: FakeClient, payload: Record<string, unknown> | string) {
  act(() => {
    client.handler?.({ body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  });
}

const QUESTION_1 = {
  type: 'QUESTION_READY',
  interview_session_id: 'session-1',
  status: 'QUESTION_READY',
  question_code: 'S_001',
  sequence: 1,
  question: '질문',
  message: null,
  audio_url: null,
  audio_status: null,
};

function renderAndConnect() {
  const hook = renderHook(() => useInterviewWebSocket());
  act(() => {
    hook.result.current.connect('token');
  });
  return { ...hook, client: clients[0] };
}

function connectAndAskQuestion() {
  const rendered = renderAndConnect();
  const { client } = rendered;
  act(() => {
    client.connect();
    client.fireReceipt();
  });
  send(client, { type: 'SESSION_STARTED', interview_session_id: 'session-1' });
  send(client, QUESTION_1);
  client.publish.mockClear();
  return rendered;
}

/** 소켓이 끊긴다(onWebSocketClose) */
function closeSocket(client: FakeClient) {
  act(() => {
    client.connected = false;
    client.config.onWebSocketClose();
  });
}

/** reactivateClient의 deactivate().then(activate) 마이크로태스크까지 진행 */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

let visibilityState: DocumentVisibilityState = 'visible';

function fireVisibility(state: DocumentVisibilityState) {
  visibilityState = state;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

const status = () => useInterviewStore.getState().status;

beforeEach(() => {
  clients.length = 0;
  routerReplace.mockReset();
  visibilityState = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState,
  });
});

afterEach(() => {
  cleanup();
  useInterviewStore.getState().reset();
  vi.useRealTimers();
});

// ──────────────────────────────────────────────
// 브로커 URL
// ──────────────────────────────────────────────

describe('normalizeBrokerUrl', () => {
  it.each([
    ['https://api.example.com/ws', 'wss://api.example.com/ws'],
    ['http://localhost:8080/ws', 'ws://localhost:8080/ws'],
    ['wss://api.example.com/ws', 'wss://api.example.com/ws'],
    ['  ws://local/ws  ', 'ws://local/ws'],
    [undefined, 'wss://api.piuda.site/ws'],
    ['   ', 'wss://api.piuda.site/ws'],
  ])('%j → %s', (input, expected) => {
    expect(normalizeBrokerUrl(input)).toBe(expected);
  });
});

// ──────────────────────────────────────────────
// 연결 시작
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — connect', () => {
  it('토큰 헤더와 reconnectDelay 0으로 클라이언트를 만들고 CONNECTING으로 바꾼다', () => {
    const { client } = renderAndConnect();

    expect(client.config.connectHeaders).toEqual({ Authorization: 'Bearer token' });
    expect(client.config.reconnectDelay).toBe(0);
    expect(client.config.brokerURL).toMatch(/^wss?:\/\//);
    expect(client.activate).toHaveBeenCalledTimes(1);
    expect(status()).toBe('CONNECTING');
  });

  it('이미 활성 클라이언트가 있으면 connect를 무시한다', () => {
    const { result } = renderAndConnect();

    act(() => {
      result.current.connect('token-2');
    });

    expect(clients).toHaveLength(1);
  });

  it('첫 연결: SUBSCRIBED + receipt 수신 시 시작 요청을 한 번만 보낸다', () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();

    act(() => {
      client.connect();
    });
    expect(status()).toBe('SUBSCRIBED');
    expect(client.subscribe).toHaveBeenCalledWith('/user/queue/interviews', expect.any(Function), {
      receipt: expect.stringMatching(/^interview-subscribe-/),
    });

    act(() => {
      client.fireReceipt();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(client.publish).toHaveBeenCalledTimes(1);
    expect(client.publish).toHaveBeenCalledWith({
      destination: '/app/interviews/start',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ interview_type: 'TECHNICAL' }),
    });
  });

  it('receipt가 오지 않아도 1초 fallback 뒤 시작 요청을 보낸다', () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();

    act(() => {
      client.connect();
    });
    expect(client.publish).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(client.publish).toHaveBeenCalledTimes(1);
  });

  it('시작 응답(SESSION_STARTED)이 15초 안에 없으면 ERROR + deactivate', () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();
    act(() => {
      client.connect();
      client.fireReceipt();
    });

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(status()).toBe('ERROR');
    expect(useInterviewStore.getState().errorMessage).toContain('지연');
    expect(client.deactivate).toHaveBeenCalled();
  });

  it('SESSION_STARTED를 받으면 시작 응답 타이머가 해제된다', () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();
    act(() => {
      client.connect();
      client.fireReceipt();
    });
    send(client, { type: 'SESSION_STARTED', interview_session_id: 'session-1' });

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(status()).toBe('SUBSCRIBED');
    expect(client.deactivate).not.toHaveBeenCalled();
  });

  it('JSON이 아닌 메시지는 무시한다', () => {
    const { client } = connectAndAskQuestion();

    send(client, 'not-json');

    expect(status()).toBe('QUESTION');
  });

  it('isConnected는 클라이언트 연결 여부를 반환한다', () => {
    const { result, client } = renderAndConnect();
    expect(result.current.isConnected()).toBe(false);

    act(() => {
      client.connect();
    });
    expect(result.current.isConnected()).toBe(true);
  });
});

// ──────────────────────────────────────────────
// 메시지 처리 (#119)
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — 메시지 (#119)', () => {
  it('ANSWER_ACCEPTED는 payload의 세션·질문 코드·sequence로 가드된다', () => {
    const { client } = connectAndAskQuestion();

    send(client, {
      type: 'ANSWER_ACCEPTED',
      interview_session_id: 'session-1',
      question_code: 'S_001',
      sequence: 0,
    });
    expect(status()).toBe('QUESTION');

    send(client, {
      type: 'ANSWER_ACCEPTED',
      interview_session_id: 'session-1',
      question_code: 'S_001',
      sequence: 1,
    });
    expect(status()).toBe('SUBSCRIBED');
    expect(useInterviewStore.getState().answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('ANSWER_ACCEPTED에 question_code·sequence가 없어도 현재 질문 수락으로 처리한다', () => {
    const { client } = connectAndAskQuestion();

    send(client, { type: 'ANSWER_ACCEPTED', interview_session_id: 'session-1' });

    expect(status()).toBe('SUBSCRIBED');
    expect(useInterviewStore.getState().answerAcceptedKey).toBe('session-1:S_001:1');
  });

  it('다른 세션의 QUESTION_READY는 무시한다', () => {
    const { client } = connectAndAskQuestion();

    send(client, { ...QUESTION_1, interview_session_id: 'session-2', sequence: 2, question: 'X' });

    expect(useInterviewStore.getState().currentQuestion).toBe('질문');
  });

  it('finishInterview는 현재 세션이면 FINISHED + disconnect, 아니면 false', () => {
    const { result, client } = connectAndAskQuestion();

    let finished: boolean | undefined;
    act(() => {
      finished = result.current.finishInterview('other-session');
    });
    expect(finished).toBe(false);
    expect(client.deactivate).not.toHaveBeenCalled();

    act(() => {
      finished = result.current.finishInterview('session-1');
    });
    expect(finished).toBe(true);
    expect(status()).toBe('FINISHED');
    expect(useInterviewStore.getState().interviewSessionId).toBe('session-1');
    expect(client.deactivate).toHaveBeenCalled();
  });

  it('INTERVIEW_FINISHED도 finishInterview로 처리한다', () => {
    const { client } = connectAndAskQuestion();

    send(client, { type: 'INTERVIEW_FINISHED', interview_session_id: 'session-1' });

    expect(status()).toBe('FINISHED');
    expect(client.deactivate).toHaveBeenCalled();
  });

  it.each([
    ['audio_url 필드가 없어도', {}],
    ['audio_url이 null이어도', { audio_url: null }],
  ])('INTERVIEW_FINISHED 페이로드에 %s 오류 없이 FINISHED로 전환한다', (_, extra) => {
    const { client } = connectAndAskQuestion();

    send(client, { type: 'INTERVIEW_FINISHED', interview_session_id: 'session-1', ...extra });

    const state = useInterviewStore.getState();
    expect(state.status).toBe('FINISHED');
    expect(state.errorMessage).toBeNull();
    expect(client.deactivate).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// STOMP ERROR (AC5)
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — STOMP ERROR', () => {
  function stompError(client: FakeClient, frame: FakeFrame) {
    act(() => {
      client.config.onStompError(frame);
    });
  }

  it('headers.message를 오류 문구로 쓰고 deactivate한다', () => {
    const { client } = connectAndAskQuestion();

    stompError(client, { headers: { message: '세션 오류' }, body: '' });

    expect(status()).toBe('ERROR');
    expect(useInterviewStore.getState().errorMessage).toBe('세션 오류');
    expect(client.deactivate).toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('headers.message가 없으면 body JSON의 message를 쓴다', () => {
    const { client } = connectAndAskQuestion();

    stompError(client, { headers: {}, body: JSON.stringify({ message: '본문 오류' }) });

    expect(useInterviewStore.getState().errorMessage).toBe('본문 오류');
  });

  it('body 파싱에 실패하면 기본 문구를 쓴다', () => {
    const { client } = connectAndAskQuestion();

    stompError(client, { headers: {}, body: '<<not json>>' });

    expect(useInterviewStore.getState().errorMessage).toBe(
      '면접을 시작할 수 없습니다. 다시 시도해 주세요.',
    );
  });

  it.each([
    ['headers.message', { headers: { message: 'Unauthorized' }, body: '' }],
    ['body message', { headers: {}, body: JSON.stringify({ message: 'unauthorized token' }) }],
  ])('%s에 unauthorized가 있으면 /login으로 이동한다', (_label, frame) => {
    const { client } = connectAndAskQuestion();

    stompError(client, frame);

    expect(routerReplace).toHaveBeenCalledWith('/login');
  });

  it('ERROR 뒤 소켓 close는 ERROR를 덮어쓰지 않고 재연결하지 않는다', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    stompError(client, { headers: { message: '세션 오류' }, body: '' });
    closeSocket(client);
    await advance(10_000);

    expect(status()).toBe('ERROR');
    expect(useInterviewStore.getState().errorMessage).toBe('세션 오류');
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('ERROR 뒤 onWebSocketError는 무시한다', () => {
    const { client } = renderAndConnect();

    stompError(client, { headers: { message: '첫 오류' }, body: '' });
    useInterviewStore.getState().setStatus('CONNECTING');
    act(() => {
      client.config.onWebSocketError();
    });

    expect(useInterviewStore.getState().errorMessage).toBe('첫 오류');
  });
});

// ──────────────────────────────────────────────
// 소켓 오류 · close 재연결 (AC6)
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — 소켓 오류', () => {
  it('CONNECTING 중 소켓 오류면 ERROR + deactivate', () => {
    const { client } = renderAndConnect();

    act(() => {
      client.config.onWebSocketError();
    });

    expect(status()).toBe('ERROR');
    expect(client.deactivate).toHaveBeenCalled();
  });

  it('활성 상태에서 소켓 오류는 상태를 바꾸지 않는다(close에서 재연결)', () => {
    const { client } = connectAndAskQuestion();

    act(() => {
      client.config.onWebSocketError();
    });

    expect(status()).toBe('QUESTION');
    expect(client.deactivate).not.toHaveBeenCalled();
  });
});

describe('useInterviewWebSocket — close 재연결', () => {
  it('재연결 onConnect는 SUBSCRIBED를 거치지 않고 이전 상태로 바로 복구한다', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();
    const history: InterviewStatus[] = [];
    const unsubscribe = useInterviewStore.subscribe((state) => history.push(state.status));

    closeSocket(client);
    expect(status()).toBe('RECONNECTING');

    await advance(1000);
    act(() => {
      client.connect();
    });
    unsubscribe();

    expect(status()).toBe('QUESTION');
    expect(history).not.toContain('SUBSCRIBED');
    expect(useInterviewStore.getState().answerAcceptedKey).toBeNull();
    // 재연결에서는 시작 요청을 다시 보내지 않는다
    await advance(2000);
    expect(client.publish).not.toHaveBeenCalledWith(
      expect.objectContaining({ destination: '/app/interviews/start' }),
    );
  });

  it('재연결은 deactivate 완료 후 activate한다(reconnectDelay 0 ACTIVE 고착 방지)', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    closeSocket(client);
    await advance(999);
    expect(client.deactivate).not.toHaveBeenCalled();

    await advance(1);
    expect(client.deactivate).toHaveBeenCalledTimes(1);
    expect(client.activate).toHaveBeenCalledTimes(2);
    expect(client.deactivate.mock.invocationCallOrder[0]).toBeLessThan(
      client.activate.mock.invocationCallOrder[1],
    );
  });

  it('SUBMITTING에서 끊기면 재연결 후 SUBMITTING으로 복구한다', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();
    useInterviewStore.getState().setStatus('SUBMITTING');

    closeSocket(client);
    await advance(1000);
    act(() => {
      client.connect();
    });

    expect(status()).toBe('SUBMITTING');
  });

  it('재시도는 1s → 2s → 4s 백오프이고, 모두 실패하면 ERROR + deactivate', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    closeSocket(client);
    await advance(1000);
    expect(client.activate).toHaveBeenCalledTimes(2);

    // RECONNECTING 중 다시 close — 이전 상태(QUESTION)를 덮어쓰지 않는다
    closeSocket(client);
    await advance(1999);
    expect(client.activate).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(client.activate).toHaveBeenCalledTimes(3);

    closeSocket(client);
    await advance(4000);
    expect(client.activate).toHaveBeenCalledTimes(4);
    expect(status()).toBe('RECONNECTING');

    const deactivateCalls = client.deactivate.mock.calls.length;
    closeSocket(client);
    expect(status()).toBe('ERROR');
    expect(useInterviewStore.getState().errorMessage).toBe(
      '연결이 끊겼습니다. 면접이 중단되었습니다.',
    );
    expect(client.deactivate.mock.calls.length).toBe(deactivateCalls + 1);

    // ERROR 이후 close는 아무것도 하지 않는다
    closeSocket(client);
    await advance(10_000);
    expect(client.activate).toHaveBeenCalledTimes(4);
  });

  it('재연결에 성공하면 재시도 횟수가 초기화된다', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    closeSocket(client);
    await advance(1000);
    closeSocket(client);
    await advance(2000);
    act(() => {
      client.connect();
    });
    expect(status()).toBe('QUESTION');

    closeSocket(client);
    await advance(999);
    expect(client.activate).toHaveBeenCalledTimes(3);
    await advance(1);
    expect(client.activate).toHaveBeenCalledTimes(4);
  });

  it('활성 상태가 아니면(CONNECTING) close에 재연결하지 않는다', async () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();

    closeSocket(client);
    await advance(10_000);

    expect(status()).toBe('CONNECTING');
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('disconnect는 재연결 타이머를 정리하고 deactivate하며 이후 close에 재연결하지 않는다', async () => {
    vi.useFakeTimers();
    const { result, client } = connectAndAskQuestion();

    closeSocket(client);
    act(() => {
      result.current.disconnect();
    });
    await advance(10_000);

    expect(client.deactivate).toHaveBeenCalled();
    expect(client.activate).toHaveBeenCalledTimes(1);

    closeSocket(client);
    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('reactivate의 deactivate 대기 중 disconnect되면 activate하지 않는다', async () => {
    vi.useFakeTimers();
    const { result, client } = connectAndAskQuestion();
    let resolveDeactivate: () => void = () => {};
    client.deactivate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = resolve;
        }),
    );

    closeSocket(client);
    await advance(1000);
    expect(client.deactivate).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.disconnect();
    });
    await act(async () => {
      resolveDeactivate();
    });

    expect(client.activate).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────
// visibilitychange (AC8)
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — visibilitychange', () => {
  it('hidden이면 아무것도 하지 않는다', () => {
    const { client } = connectAndAskQuestion();
    client.connected = false;

    fireVisibility('hidden');

    expect(status()).toBe('QUESTION');
  });

  it('클라이언트가 없으면 아무것도 하지 않는다', () => {
    renderHook(() => useInterviewWebSocket());
    useInterviewStore.getState().setStatus('QUESTION');

    fireVisibility('visible');

    expect(status()).toBe('QUESTION');
  });

  it.each(['IDLE', 'FINISHED', 'ERROR'] as const)('%s이면 아무것도 하지 않는다', (s) => {
    const { client } = connectAndAskQuestion();
    client.connected = false;
    useInterviewStore.getState().setStatus(s);

    fireVisibility('visible');

    expect(status()).toBe(s);
  });

  it('연결이 살아 있으면 아무것도 하지 않는다', () => {
    connectAndAskQuestion();

    fireVisibility('visible');

    expect(status()).toBe('QUESTION');
  });

  it('CONNECTING/RECONNECTING 중이면 새 재연결을 시작하지 않는다', async () => {
    vi.useFakeTimers();
    const { client } = renderAndConnect();

    fireVisibility('visible');
    await advance(10_000);

    expect(status()).toBe('CONNECTING');
    expect(client.deactivate).not.toHaveBeenCalled();
  });

  it('끊겨 있으면 RECONNECTING 후 재연결하고 이전 상태로 복구한다', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();
    client.connected = false;

    fireVisibility('visible');
    expect(status()).toBe('RECONNECTING');

    await advance(1000);
    expect(client.activate).toHaveBeenCalledTimes(2);

    act(() => {
      client.connect();
    });
    expect(status()).toBe('QUESTION');
  });

  it('close 재연결 타이머와 겹치지 않는다(기존 타이머 정리)', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    // close가 1초 타이머를 건 상태에서 상태를 강제로 QUESTION으로 두고 탭 복귀
    closeSocket(client);
    useInterviewStore.getState().setStatus('QUESTION');
    fireVisibility('visible');

    await advance(1000);
    // close의 1초 타이머는 정리되어 아직 activate가 없다 (visibility의 2초 타이머만 남음)
    expect(client.activate).toHaveBeenCalledTimes(1);
    await advance(1000);
    expect(client.activate).toHaveBeenCalledTimes(2);
    await advance(10_000);
    expect(client.activate).toHaveBeenCalledTimes(2);
  });

  it('재시도를 모두 썼으면 ERROR + deactivate', async () => {
    vi.useFakeTimers();
    const { client } = connectAndAskQuestion();

    closeSocket(client);
    await advance(1000);
    closeSocket(client);
    await advance(2000);
    closeSocket(client);
    await advance(4000);
    useInterviewStore.getState().setStatus('QUESTION');
    client.connected = false;
    const deactivateCalls = client.deactivate.mock.calls.length;

    fireVisibility('visible');

    expect(status()).toBe('ERROR');
    expect(client.deactivate.mock.calls.length).toBe(deactivateCalls + 1);
  });
});

// ──────────────────────────────────────────────
// 언마운트
// ──────────────────────────────────────────────

describe('useInterviewWebSocket — 언마운트', () => {
  it('언마운트 시 deactivate하고 이후 close에도 재연결하지 않는다', async () => {
    vi.useFakeTimers();
    const { client, unmount } = connectAndAskQuestion();

    unmount();
    expect(client.deactivate).toHaveBeenCalled();

    closeSocket(client);
    await advance(10_000);

    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('재연결 대기(deactivate 중) 중 언마운트되면 activate하지 않는다', async () => {
    vi.useFakeTimers();
    const { client, unmount } = connectAndAskQuestion();
    let resolveDeactivate: () => void = () => {};
    client.deactivate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = resolve;
        }),
    );

    closeSocket(client);
    await advance(1000);
    unmount();
    await act(async () => {
      resolveDeactivate();
    });

    expect(client.activate).toHaveBeenCalledTimes(1);
  });

  it('언마운트 시 대기 중인 재연결 타이머를 정리한다', async () => {
    vi.useFakeTimers();
    const { client, unmount } = connectAndAskQuestion();

    closeSocket(client);
    unmount();
    await advance(10_000);

    expect(client.activate).toHaveBeenCalledTimes(1);
  });
});
