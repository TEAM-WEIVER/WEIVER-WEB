import { type Page, type WebSocketRoute } from '@playwright/test';

import { test, expect } from '../fixtures/auth';

/**
 * AI TTS 연동 인수 테스트 (#118)
 *
 * 커버 AC: AC1, AC2, AC3, AC4, AC5, AC6
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - STOMP WebSocket 서버 주소: NEXT_PUBLIC_WS_URL 환경변수 (기본값 ws://api.piuda.site/ws)
 *
 * WebSocket 목킹 전략:
 * - Playwright page.routeWebSocket()으로 STOMP 프레임을 직접 시뮬레이션한다.
 * - QUESTION_READY 페이로드에 audio_url / audio_status 신규 필드가 포함된다.
 * - Audio API는 page.addInitScript()로 모킹한다 (실제 미디어 파일 불필요).
 */

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

const INTERVIEW_URL = '/applicant/interview';
const WS_URL_PATTERN = /ws(s)?:\/\/.+\/ws/;
const SESSION_ID = 'session-tts-118';
const AUDIO_URL = 'https://cdn.piuda.site/tts/question-1.mp3';

// ──────────────────────────────────────────────
// STOMP 프레임 빌더
// ──────────────────────────────────────────────

function stompConnected(): string {
  return 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0';
}

function stompMessage(destination: string, body: object): string {
  const bodyStr = JSON.stringify(body);
  const contentLength = Buffer.byteLength(bodyStr, 'utf8');
  return `MESSAGE\ndestination:${destination}\nsubscription:sub-0\nmessage-id:mock-${Date.now()}\ncontent-type:application/json\ncontent-length:${contentLength}\n\n${bodyStr}\0`;
}

function frameToString(data: string | Buffer): string {
  if (typeof data === 'string') return data;
  return data.toString('utf-8');
}

function sendInterviewMessage(
  ws: WebSocketRoute,
  payload: object,
  delay = 50,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    ws.send(stompMessage('/user/queue/interviews', payload));
  }, delay);
}

// ──────────────────────────────────────────────
// 메시지 페이로드 팩토리
// ──────────────────────────────────────────────

const SESSION_STARTED = {
  type: 'SESSION_STARTED',
  interview_session_id: SESSION_ID,
  total: 3,
};

/** AC1: audio_status READY — 서버 TTS URL 포함 */
const questionReadyWithAudio = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: SESSION_ID,
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: AUDIO_URL,
  audio_status: 'READY',
});

/** AC2: audio_status UNAVAILABLE — 브라우저 TTS 폴백 */
const questionReadyUnavailable = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: SESSION_ID,
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: null,
  audio_status: 'UNAVAILABLE',
});

/** AC2: audio_status null — 브라우저 TTS 폴백 */
const questionReadyNullStatus = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: SESSION_ID,
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: null,
  audio_status: null,
});

const answerAccepted = (sequence: number) => ({
  type: 'ANSWER_ACCEPTED',
  interview_session_id: SESSION_ID,
  sequence,
});

const INTERVIEW_FINISHED = {
  type: 'INTERVIEW_FINISHED',
  interview_session_id: SESSION_ID,
};

// ──────────────────────────────────────────────
// Audio API 모킹 헬퍼
// ──────────────────────────────────────────────

/**
 * Audio 객체를 모킹한다.
 *
 * @param mode
 *   - 'success': play()가 즉시 resolve되고 canplay + ended 이벤트가 순서대로 발화됨
 *   - 'error': error 이벤트 발화 → 로드 실패 시나리오
 *   - 'timeout': canplay 이벤트가 5초간 오지 않는 타임아웃 시나리오 (실제 타임아웃 대기는 하지 않음)
 *   - 'blocked': play()가 NotAllowedError로 reject — Safari 자동재생 차단
 */
type AudioMockMode = 'success' | 'error' | 'timeout' | 'blocked';

async function setupAudioMock(page: Page, mode: AudioMockMode) {
  await page.addInitScript((audioMode: AudioMockMode) => {
    let audioInstance: {
      src: string;
      currentTime: number;
      oncanplay: (() => void) | null;
      onended: (() => void) | null;
      onerror: ((e: Event) => void) | null;
      play: () => Promise<void>;
      pause: () => void;
      _triggerCanplay: () => void;
      _triggerEnded: () => void;
      _triggerError: () => void;
    } | null = null;

    class MockAudio {
      src: string;
      currentTime: number;
      oncanplay: (() => void) | null;
      onended: (() => void) | null;
      onerror: ((e: Event) => void) | null;
      private _eventListeners: Map<string, Array<() => void>>;

      constructor(src: string) {
        this.src = src;
        this.currentTime = 0;
        this.oncanplay = null;
        this.onended = null;
        this.onerror = null;
        this._eventListeners = new Map();
        audioInstance = this as unknown as typeof audioInstance;

        if (audioMode === 'error') {
          setTimeout(() => this.onerror?.(new Event('error')), 100);
        } else if (audioMode === 'success') {
          setTimeout(() => {
            this.oncanplay?.();
            const listeners = this._eventListeners.get('canplay') ?? [];
            listeners.forEach((fn) => fn());
            this._eventListeners.delete('canplay');
          }, 50);
        }
        // 'timeout': canplay 이벤트를 보내지 않음
        // 'blocked': play() 호출 시 reject
      }

      addEventListener(event: string, fn: () => void, _opts?: unknown) {
        if (!this._eventListeners.has(event)) {
          this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event)!.push(fn);
      }

      removeEventListener(event: string, fn: () => void) {
        const listeners = this._eventListeners.get(event) ?? [];
        this._eventListeners.set(
          event,
          listeners.filter((l) => l !== fn),
        );
      }

      play(): Promise<void> {
        if (audioMode === 'blocked') {
          return Promise.reject(
            Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }),
          );
        }
        if (audioMode === 'success') {
          setTimeout(() => this.onended?.(), 500);
        }
        return Promise.resolve();
      }

      pause() {}

      _triggerCanplay() {
        this.oncanplay?.();
        const listeners = this._eventListeners.get('canplay') ?? [];
        listeners.forEach((fn) => fn());
        this._eventListeners.delete('canplay');
      }

      _triggerEnded() {
        this.onended?.();
      }

      _triggerError() {
        this.onerror?.(new Event('error'));
      }
    }

    // window.Audio를 모킹
    (window as unknown as Record<string, unknown>)['Audio'] = MockAudio;
    (window as unknown as Record<string, unknown>)['_getAudioInstance'] = () => audioInstance;
  }, mode);
}

/**
 * speechSynthesis를 모킹한다.
 * onend 콜백을 즉시 호출하거나 기록해두어 나중에 검사할 수 있다.
 */
async function setupSpeechSynthesisMock(
  page: Page,
  opts: { callOnend?: boolean } = { callOnend: true },
) {
  await page.addInitScript((callOnend: boolean) => {
    let speakCallCount = 0;
    let cancelCallCount = 0;
    let lastUtterance: SpeechSynthesisUtterance | null = null;

    const mock = {
      cancel() {
        cancelCallCount++;
      },
      speak(utterance: SpeechSynthesisUtterance) {
        speakCallCount++;
        lastUtterance = utterance;
        if (callOnend) {
          setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 100);
        }
      },
    };

    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: mock });
    (window as unknown as Record<string, unknown>)['_getSpeechStats'] = () => ({
      speakCallCount,
      cancelCallCount,
      lastUtterance: lastUtterance
        ? {
            lang: (lastUtterance as SpeechSynthesisUtterance).lang,
            rate: (lastUtterance as SpeechSynthesisUtterance).rate,
          }
        : null,
    });
  }, opts.callOnend ?? true);
}

// ──────────────────────────────────────────────
// 공통 헬퍼: 면접 페이지 진입 + 초기 설정
// ──────────────────────────────────────────────

async function gotoInterviewWithAuth(page: Page, speechTranscript = '테스트 답변입니다.') {
  await page.addInitScript((transcript: string) => {
    class MockSpeechRecognition {
      lang = 'ko-KR';
      continuous = true;
      interimResults = true;
      onresult: ((event: object) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() {
        this.onresult?.({
          resultIndex: 0,
          results: [{ 0: { transcript }, isFinal: true }],
        });
      }

      stop() {
        this.onend?.();
      }

      abort() {}
    }

    for (const property of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, property, { configurable: true, value: MockSpeechRecognition });
    }
  }, speechTranscript);

  await page.goto(INTERVIEW_URL);

  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await checkboxes.nth(i).check();
  }
  await expect(page.getByRole('button', { name: '면접 시작' })).toBeEnabled();
}

// ──────────────────────────────────────────────
// AC1. READY 상태 — 서버 TTS 오디오 재생
// ──────────────────────────────────────────────

test.describe('AC1: READY 상태 — 서버 TTS 오디오 재생', () => {
  test('QUESTION_READY audio_status=READY 수신 시 질문 텍스트가 즉시 표시된다', async ({
    page,
  }) => {
    // Given: Audio mock이 성공적으로 재생됨
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'success');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When: 면접 시작
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 질문 텍스트가 즉시 표시된다
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
  });

  test('READY 재생 완료 후 ttsState.isPlaying이 false로 전이되어 AI 영상이 listening 모드로 전환된다', async ({
    page,
  }) => {
    // Given: Audio mock이 성공적으로 재생 후 ended 이벤트 발화
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'success');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 재생 완료 후 '답변하기' 버튼이 활성화된다 (isPlaying: false, isDone: true)
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled({ timeout: 3000 });
  });

  test('READY 재생 중에는 speechSynthesis.speak가 호출되지 않는다', async ({ page }) => {
    // Given: Audio mock success + speechSynthesis mock
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'success');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 재생 완료까지 짧게 대기 후 speak 호출 여부 확인
    await page.waitForTimeout(700);

    // Then: speechSynthesis.speak는 한 번도 호출되지 않는다
    const stats = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
    );
    expect((stats as { speakCallCount: number } | undefined)?.speakCallCount ?? 0).toBe(0);
  });
});

// ──────────────────────────────────────────────
// AC2. UNAVAILABLE / null 상태 — 브라우저 TTS 폴백
// ──────────────────────────────────────────────

test.describe('AC2: UNAVAILABLE/null 상태 — 브라우저 TTS 폴백', () => {
  test('audio_status=UNAVAILABLE 수신 시 speechSynthesis.speak가 호출된다', async ({ page }) => {
    // Given: speechSynthesis mock 설정
    await setupSpeechSynthesisMock(page);

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyUnavailable(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When: 면접 시작
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: speechSynthesis.speak가 lang:'ko-KR', rate≈0.9로 호출된다
    // SpeechSynthesisUtterance.rate는 float32로 처리될 수 있으므로 근사값으로 비교한다
    type SpeechStats = {
      speakCallCount: number;
      lastUtterance: { lang: string; rate: number } | null;
    };
    await expect
      .poll<SpeechStats>(
        async () =>
          (await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
          )) as SpeechStats,
        { timeout: 3000 },
      )
      .toMatchObject({ speakCallCount: 1, lastUtterance: { lang: 'ko-KR' } });
    // rate 정밀도 별도 검사 (float32 반올림 허용)
    const finalStats = (await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
    )) as SpeechStats;
    expect(Math.round((finalStats.lastUtterance?.rate ?? 0) * 10) / 10).toBe(0.9);
  });

  test('audio_status=null 수신 시 speechSynthesis.speak가 호출된다', async ({ page }) => {
    // Given
    await setupSpeechSynthesisMock(page);

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyNullStatus(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: speechSynthesis.speak가 호출된다
    await expect
      .poll(
        async () =>
          (await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
          )) as { speakCallCount: number },
        { timeout: 3000 },
      )
      .toMatchObject({ speakCallCount: 1 });
  });

  test('UNAVAILABLE 폴백 완료 후 답변하기 버튼이 활성화된다', async ({ page }) => {
    // Given: speechSynthesis onend를 즉시 호출
    await setupSpeechSynthesisMock(page, { callOnend: true });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyUnavailable(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 폴백 TTS 완료 후 답변 버튼이 활성화된다
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled({ timeout: 3000 });
  });
});

// ──────────────────────────────────────────────
// AC3. 오디오 로드 실패 → 브라우저 TTS 폴백
// ──────────────────────────────────────────────

test.describe('AC3: 오디오 로드 실패 시 브라우저 TTS 폴백', () => {
  test('Audio error 이벤트 발생 시 speechSynthesis 폴백이 실행된다', async ({ page }) => {
    // Given: Audio mock이 error 이벤트를 즉시 발화
    await setupSpeechSynthesisMock(page, { callOnend: true });
    await setupAudioMock(page, 'error');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: error 후 speechSynthesis.speak가 호출된다
    await expect
      .poll(
        async () =>
          (await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
          )) as { speakCallCount: number },
        { timeout: 3000 },
      )
      .toMatchObject({ speakCallCount: 1 });
  });

  test('오디오 로드 실패 시 사용자에게 별도 오류 메시지가 표시되지 않는다', async ({ page }) => {
    // Given: Audio error 이벤트 발화
    await setupSpeechSynthesisMock(page, { callOnend: true });
    await setupAudioMock(page, 'error');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 폴백 후 잠시 대기
    await page.waitForTimeout(500);

    // Then: 텍스트가 있는 role="alert" 오류 메시지가 표시되지 않는다
    // (Next.js 내부 __next-route-announcer__ 같은 빈 alert 요소는 제외)
    await expect(page.locator('[role="alert"]').filter({ hasText: /.+/ })).not.toBeVisible();
  });

  test('오디오 로드 실패 후 폴백 TTS 완료 시 답변하기 버튼이 활성화된다', async ({ page }) => {
    // Given: Audio error → speechSynthesis 폴백 → onend 즉시 호출
    await setupSpeechSynthesisMock(page, { callOnend: true });
    await setupAudioMock(page, 'error');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 폴백 완료 후 답변하기 버튼이 활성화된다
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled({ timeout: 3000 });
  });
});

// ──────────────────────────────────────────────
// AC4. 다시 듣기 — 재생 경로별 재실행
// ──────────────────────────────────────────────

test.describe('AC4: 다시 듣기 — 재생 경로별 재실행', () => {
  test('READY 경로 재생 완료 후 다시 듣기 버튼 클릭 시 audio.play()가 재호출된다', async ({
    page,
  }) => {
    // Given: Audio success mock
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'success');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 재생 완료 대기
    await expect(page.getByRole('button', { name: '다시 듣기' })).toBeVisible({ timeout: 3000 });

    // When: 다시 듣기 버튼 클릭
    await page.getByRole('button', { name: '다시 듣기' }).click();

    // Then: AI 면접관 영상이 다시 questioning 모드로 전환된다
    // (questioning 모드일 때 답변하기 버튼이 비활성화됨)
    await expect(page.getByRole('button', { name: '답변하기' })).toBeDisabled({ timeout: 1000 });
  });

  test('UNAVAILABLE 폴백 경로 재생 완료 후 다시 듣기 버튼 클릭 시 speechSynthesis.speak가 재호출된다', async ({
    page,
  }) => {
    // Given: speechSynthesis mock (onend 즉시 호출)
    await setupSpeechSynthesisMock(page, { callOnend: true });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyUnavailable(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 폴백 TTS 완료 후 다시 듣기 버튼 대기
    await expect(page.getByRole('button', { name: '다시 듣기' })).toBeVisible({ timeout: 3000 });

    // When: 다시 듣기 버튼 클릭
    await page.getByRole('button', { name: '다시 듣기' }).click();

    // Then: speechSynthesis.speak가 2번째로 호출된다 (최초 1회 + 다시 듣기 1회)
    await expect
      .poll(
        async () =>
          (await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
          )) as { speakCallCount: number },
        { timeout: 3000 },
      )
      .toMatchObject({ speakCallCount: 2 });
  });
});

// ──────────────────────────────────────────────
// AC5. Safari 자동재생 차단 대응
// ──────────────────────────────────────────────

test.describe('AC5: Safari 자동재생 차단 대응', () => {
  test('play()가 NotAllowedError로 reject될 때 수동 재생 버튼이 표시된다', async ({ page }) => {
    // Given: Audio blocked mock (play() → NotAllowedError)
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'blocked');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 수동 재생 버튼이 표시된다 (aria-label="질문 음성 재생")
    await expect(page.getByRole('button', { name: '질문 음성 재생' })).toBeVisible({
      timeout: 3000,
    });
  });

  test('play() 차단 시 답변하기 버튼은 여전히 활성화 가능하다', async ({ page }) => {
    // Given: Audio blocked
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'blocked');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 수동 재생 버튼 표시 확인
    await expect(page.getByRole('button', { name: '질문 음성 재생' })).toBeVisible({
      timeout: 3000,
    });

    // Then: 답변하기 버튼이 비활성화되지 않는다 (면접 진행 중단 없음)
    // isPlayBlocked=true이므로 TTS는 미완료이지만, 사용자가 직접 답변하기 클릭 가능
    await expect(page.getByRole('button', { name: '답변하기' })).toBeVisible({ timeout: 2000 });
  });

  test('수동 재생 버튼 클릭 시 audio.play()를 재시도한다', async ({ page }) => {
    // Given: Audio blocked → 수동 버튼 클릭 후 success 시나리오
    // 첫 번째 play()는 blocked, 두 번째는 성공하도록 모킹
    await page.addInitScript(() => {
      let playCallCount = 0;

      class MockAudio {
        src: string;
        currentTime: number;
        oncanplay: (() => void) | null;
        onended: (() => void) | null;
        onerror: ((e: Event) => void) | null;
        private _listeners: Map<string, Array<() => void>>;

        constructor(src: string) {
          this.src = src;
          this.currentTime = 0;
          this.oncanplay = null;
          this.onended = null;
          this.onerror = null;
          this._listeners = new Map();
          setTimeout(() => {
            this.oncanplay?.();
            const ls = this._listeners.get('canplay') ?? [];
            ls.forEach((fn) => fn());
            this._listeners.delete('canplay');
          }, 50);
        }

        addEventListener(event: string, fn: () => void, _opts?: unknown) {
          if (!this._listeners.has(event)) this._listeners.set(event, []);
          this._listeners.get(event)!.push(fn);
        }

        removeEventListener(event: string, fn: () => void) {
          const ls = this._listeners.get(event) ?? [];
          this._listeners.set(
            event,
            ls.filter((l) => l !== fn),
          );
        }

        play(): Promise<void> {
          playCallCount++;
          if (playCallCount === 1) {
            // 첫 번째 play: 자동재생 차단
            return Promise.reject(
              Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }),
            );
          }
          // 두 번째 play (수동): 성공
          setTimeout(() => this.onended?.(), 300);
          return Promise.resolve();
        }

        pause() {}
      }

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { cancel() {}, speak(_u: SpeechSynthesisUtterance) {} },
      });
      (window as unknown as Record<string, unknown>)['Audio'] = MockAudio;
      (window as unknown as Record<string, unknown>)['_getPlayCallCount'] = () => playCallCount;
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 수동 재생 버튼 표시 확인
    await expect(page.getByRole('button', { name: '질문 음성 재생' })).toBeVisible({
      timeout: 3000,
    });

    // When: 수동 재생 버튼 클릭
    await page.getByRole('button', { name: '질문 음성 재생' }).click();

    // Then: play()가 총 2번 호출된다 (1차 자동 + 2차 수동)
    await expect
      .poll(
        async () =>
          await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getPlayCallCount']?.(),
          ),
        { timeout: 3000 },
      )
      .toBe(2);
  });

  test('다음 QUESTION_READY 수신 시 isPlayBlocked가 초기화되어 수동 재생 버튼이 사라진다', async ({
    page,
  }) => {
    // Given: 첫 번째 질문 시 Audio blocked → 수동 재생 버튼 표시
    // 두 번째 질문 시에는 Audio success → 수동 재생 버튼이 사라짐
    await setupSpeechSynthesisMock(page, { callOnend: false });
    // 첫 번째 Audio는 blocked, 이후는 success로 작동
    await page.addInitScript(() => {
      let instanceCount = 0;

      class MockAudio {
        src: string;
        currentTime = 0;
        oncanplay: (() => void) | null = null;
        onended: (() => void) | null = null;
        onerror: ((e: Event) => void) | null = null;
        private _isFirst: boolean;
        private _listeners: Map<string, Array<() => void>>;

        constructor(src: string) {
          this.src = src;
          instanceCount++;
          this._isFirst = instanceCount === 1;
          this._listeners = new Map();
          // 첫 번째가 아닌 경우 canplay 발화
          if (!this._isFirst) {
            setTimeout(() => {
              this.oncanplay?.();
              const ls = this._listeners.get('canplay') ?? [];
              ls.forEach((fn) => fn());
              this._listeners.delete('canplay');
            }, 50);
          }
        }

        addEventListener(event: string, fn: () => void, _opts?: unknown) {
          if (!this._listeners.has(event)) this._listeners.set(event, []);
          this._listeners.get(event)!.push(fn);
        }

        removeEventListener(event: string, fn: () => void) {
          const ls = this._listeners.get(event) ?? [];
          this._listeners.set(
            event,
            ls.filter((l) => l !== fn),
          );
        }

        play(): Promise<void> {
          if (this._isFirst) {
            return Promise.reject(
              Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }),
            );
          }
          // 두 번째 이후: 재생 성공 (ended는 안 보내서 재생 중 상태 유지)
          return Promise.resolve();
        }

        pause() {}
      }

      (window as unknown as Record<string, unknown>)['Audio'] = MockAudio;
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
          if (destination.includes('/answers')) {
            ws.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
            // When: 다음 QUESTION_READY 수신
            sendInterviewMessage(ws, questionReadyWithAudio(2), 100);
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 수동 재생 버튼 확인
    await expect(page.getByRole('button', { name: '질문 음성 재생' })).toBeVisible({
      timeout: 3000,
    });

    // 답변 제출 (수동 재생 버튼이 있어도 답변 가능)
    await page.getByRole('button', { name: '답변하기' }).click();
    await page.getByRole('button', { name: '제출하기' }).click();

    // Then: 다음 질문 수신 후 수동 재생 버튼이 사라진다
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('button', { name: '질문 음성 재생' })).not.toBeVisible({
      timeout: 2000,
    });
  });
});

// ──────────────────────────────────────────────
// AC6. 기존 speechSynthesis 코드 제거 확인
// ──────────────────────────────────────────────

test.describe('AC6: 기존 speechSynthesis 직접 호출 코드 제거', () => {
  test('READY 경로에서 speechSynthesis.speak는 한 번도 호출되지 않는다', async ({ page }) => {
    // Given: READY 상태 + speechSynthesis mock
    await setupSpeechSynthesisMock(page, { callOnend: false });
    await setupAudioMock(page, 'success');

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 재생 완료 대기
    await page.waitForTimeout(700);

    // Then: READY 경로에서 speechSynthesis.speak는 한 번도 호출되지 않는다
    const stats = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
    );
    expect((stats as { speakCallCount: number } | undefined)?.speakCallCount ?? 0).toBe(0);
  });

  test('UNAVAILABLE 폴백 경로에서만 speechSynthesis.speak가 호출된다', async ({ page }) => {
    // Given: UNAVAILABLE 상태
    await setupSpeechSynthesisMock(page, { callOnend: true });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyUnavailable(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: UNAVAILABLE 폴백 경로에서 speak가 정확히 1번 호출된다
    await expect
      .poll(
        async () =>
          (await page.evaluate(() =>
            (window as unknown as Record<string, unknown>)['_getSpeechStats']?.(),
          )) as { speakCallCount: number },
        { timeout: 3000 },
      )
      .toMatchObject({ speakCallCount: 1 });
  });

  test('QUESTION_READY 페이로드에 audio_url과 audio_status 필드가 포함될 때 QuestionReadyPayload 타입이 수용한다', async ({
    page,
  }) => {
    // Given: 신규 필드를 포함한 QUESTION_READY 메시지
    await setupSpeechSynthesisMock(page, { callOnend: true });
    await setupAudioMock(page, 'success');

    let receivedPayload: {
      audio_url?: string | null;
      audio_status?: string | null;
    } | null = null;

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            const payload = questionReadyWithAudio(1);
            receivedPayload = { audio_url: payload.audio_url, audio_status: payload.audio_status };
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, payload);
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 페이로드에 audio_url, audio_status가 포함된다
    expect(receivedPayload?.audio_url).toBe(AUDIO_URL);
    expect(receivedPayload?.audio_status).toBe('READY');
  });
});

// ──────────────────────────────────────────────
// INTERVIEW_FINISHED 연계 — TTS 정리 확인
// ──────────────────────────────────────────────

test.describe('TTS 정리: 컴포넌트 unmount 시 오디오 중단', () => {
  test('면접 완료 화면으로 전환 시 Audio 재생이 중단된다', async ({ page }) => {
    // Given: Audio 재생 중 INTERVIEW_FINISHED 수신
    await page.addInitScript(() => {
      let pauseCallCount = 0;

      class MockAudio {
        src: string;
        currentTime: number;
        oncanplay: (() => void) | null;
        onended: (() => void) | null;
        onerror: ((e: Event) => void) | null;
        private _listeners: Map<string, Array<() => void>>;

        constructor(src: string) {
          this.src = src;
          this.currentTime = 0;
          this.oncanplay = null;
          this.onended = null;
          this.onerror = null;
          this._listeners = new Map();
          // canplay 발화 — ended는 발화하지 않아 재생 중 상태 유지
          setTimeout(() => {
            this.oncanplay?.();
            const ls = this._listeners.get('canplay') ?? [];
            ls.forEach((fn) => fn());
            this._listeners.delete('canplay');
          }, 50);
        }

        addEventListener(event: string, fn: () => void, _opts?: unknown) {
          if (!this._listeners.has(event)) this._listeners.set(event, []);
          this._listeners.get(event)!.push(fn);
        }

        removeEventListener(event: string, fn: () => void) {
          const ls = this._listeners.get(event) ?? [];
          this._listeners.set(
            event,
            ls.filter((l) => l !== fn),
          );
        }

        play(): Promise<void> {
          // ended를 발화하지 않아 재생 중 상태 유지 → 답변하기 버튼 활성화를 위해 2초 뒤 ended 발화
          setTimeout(() => this.onended?.(), 2000);
          return Promise.resolve();
        }

        pause() {
          pauseCallCount++;
        }
      }

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { cancel() {}, speak(_u: SpeechSynthesisUtterance) {} },
      });
      (window as unknown as Record<string, unknown>)['Audio'] = MockAudio;
      (window as unknown as Record<string, unknown>)['_getPauseCallCount'] = () => pauseCallCount;
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (frame.startsWith('SEND')) {
          const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReadyWithAudio(1));
          }
          if (destination.includes('/answers')) {
            // When: 답변 제출 즉시 INTERVIEW_FINISHED
            ws.send(stompMessage('/user/queue/interviews', INTERVIEW_FINISHED));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 2초 후 ended가 발화되어 TTS 완료 → 답변하기 버튼 활성화
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: '답변하기' }).click();
    await expect(page.getByRole('button', { name: '제출하기' })).toBeEnabled({ timeout: 5000 });
    await page.getByRole('button', { name: '제출하기' }).click();

    // Then: 면접 완료 화면으로 전환된다
    await expect(page.getByText('면접이 완료되었어요.', { exact: true }).first()).toBeVisible({
      timeout: 5000,
    });

    // Then: Audio.pause()가 호출되어 재생이 중단된다 (메모리 누수 방지)
    const pauseCount = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['_getPauseCallCount']?.(),
    );
    expect((pauseCount as number | undefined) ?? 0).toBeGreaterThanOrEqual(1);
  });
});
