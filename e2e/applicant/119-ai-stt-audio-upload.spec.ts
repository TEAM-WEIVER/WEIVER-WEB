import fs from 'node:fs';
import path from 'node:path';

import { type Locator, type Page, type Route, type WebSocketRoute } from '@playwright/test';

import { test, expect } from '../fixtures/auth';

/**
 * AI 면접 답변 녹음 업로드 STT 인수 테스트 (#119)
 *
 * 커버 AC: AC1 ~ AC14 (docs/plans/119-ai-stt-audio-upload.md)
 *
 * 목킹 전략:
 * - STOMP: page.routeWebSocket()으로 프레임을 직접 시뮬레이션한다 (#44, #118 패턴).
 * - 업로드 REST: page.route()로 `POST /api/interviews/{id}/answers/audio`를 가로챈다.
 *   응답 본문은 src/mocks/handlers/interview.ts의 MSW 시나리오와 같은 envelope를 쓴다.
 * - 브라우저 API: page.addInitScript()로 navigator.mediaDevices.getUserMedia,
 *   MediaRecorder(isTypeSupported/start/stop/ondataavailable/onstop), speechSynthesis를 대체한다.
 *   업로드 요청의 FormData 구성은 window.fetch 스파이로 페이지 안에서 기록한다.
 * - 시간: 120초 자동 종료(AC3)와 35초 deadline(AC10)은 page.clock으로 진행시킨다.
 *
 * 셀렉터: 계획서의 한국어 문구와 role(status/alert/button) 기준. 목업 없음.
 */

test.describe.configure({ timeout: 60_000 });

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

const INTERVIEW_URL = '/applicant/interview';
const WS_URL_PATTERN = /ws(s)?:\/\/.+\/ws/;
const SESSION_ID = 'session-stt-119';
const AUDIO_UPLOAD_ROUTE = /\/api\/interviews\/[^/]+\/answers\/audio(\?.*)?$/;
const REISSUE_ROUTE = '**/api/auth/reissue';
const BOOTSTRAP_ACCESS_TOKEN = 'mock-access-token';
const REISSUED_ACCESS_TOKEN = 'reissued-access-token';
const DEFAULT_BLOB_SIZE = 4096;

const COPY = {
  startButton: '면접 시작하기',
  answer: '답변하기',
  submit: '제출하기',
  submitting: '제출 중...',
  resubmit: '다시 제출',
  rerecord: '다시 녹음',
  retryMic: '다시 시도',
  recheckMic: '다시 확인',
  replay: '다시 듣기',
  reportError: '오류가 있어요',
  recording: '지원자님이 답변을 하고 있어요.',
  processing: '답변을 처리하고 있어요...',
  waiting: '다음 질문을 준비하고 있어요.',
  autoSubmitted: '답변 시간(2분)이 끝나 자동으로 제출했어요.',
  tooShort: '답변이 너무 짧아요. 다시 녹음해 주세요.',
  tooLong: '답변은 최대 2분까지 가능해요. 2분 안으로 다시 녹음해 주세요.',
  audioInvalid: '녹음 파일을 처리할 수 없어요. 다시 녹음해 주세요.',
  tooLarge: '녹음 파일이 너무 커요(최대 10MB). 조금 더 짧게 다시 녹음해 주세요.',
  notRecognized: '음성이 인식되지 않았어요. 조용한 곳에서 또렷하게 다시 녹음해 주세요.',
  rateLimited: '요청이 많아 처리하지 못했어요. 잠시 후 다시 제출해 주세요.',
  transcriptionFailed:
    '음성 변환에 실패했어요. 다시 제출해 주세요. 계속 실패하면 다시 녹음해 주세요.',
  network: '답변 전송에 실패했어요. 네트워크 상태를 확인한 뒤 다시 제출해 주세요.',
  server5xx: '서버에 일시적인 문제가 생겼어요. 잠시 후 다시 제출해 주세요.',
  client4xx:
    "답변을 전송하지 못했어요. 다시 제출해 주시고, 계속 실패하면 '오류가 있어요' 버튼으로 알려주세요.",
  sessionExpired: '로그인이 만료되었어요. 다시 로그인해 주세요.',
  micUnavailable:
    '마이크를 사용할 수 없어요. 마이크 연결과 브라우저 권한을 확인한 뒤 다시 시도해 주세요.',
  micDeniedCard: '브라우저 설정에서 마이크 권한을 허용해주세요.',
  micDeniedReason: '마이크 권한을 허용해야 면접을 시작할 수 있어요.',
  unsupportedCard:
    '이 브라우저에서는 음성 답변을 녹음할 수 없어요. 최신 Chrome, Edge, Safari 또는 Firefox에서 접속해 주세요.',
  unsupportedReason: '지원되는 브라우저에서 면접을 시작해 주세요.',
  unsupportedTag: '지원되지 않음',
  cameraDeniedTag: '권한이 거부되었어요',
  finished: '면접이 완료되었어요.',
} as const;

/** 녹음 경과 시간 표시 (예: `0:12 / 2:00`) */
const ELAPSED_JUST_STARTED = /0:0[0-3]\s*\/\s*2:00/;
const ELAPSED_NON_ZERO = /(0:0[1-9]|0:[1-5]\d|[12]:\d{2})\s*\/\s*2:00/;
const ELAPSED_MAXED = /2:00\s*\/\s*2:00/;

const ALL_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

// ──────────────────────────────────────────────
// STOMP 프레임 빌더
// ──────────────────────────────────────────────

function stompConnected(): string {
  return 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0';
}

function stompMessage(destination: string, body: object): string {
  const bodyStr = JSON.stringify(body);
  const contentLength = Buffer.byteLength(bodyStr, 'utf8');
  return `MESSAGE\ndestination:${destination}\nsubscription:sub-0\nmessage-id:mock-${Date.now()}-${Math.random()}\ncontent-type:application/json\ncontent-length:${contentLength}\n\n${bodyStr}\0`;
}

function stompError(message: string): string {
  const body = JSON.stringify({ message, auth_error: false });
  return `ERROR\nmessage:${message}\ncontent-type:application/json\n\n${body}\0`;
}

function frameToString(data: string | Buffer): string {
  return typeof data === 'string' ? data : data.toString('utf-8');
}

// ──────────────────────────────────────────────
// STOMP 페이로드
// ──────────────────────────────────────────────

const questionCode = (sequence: number) => `Q${String(sequence).padStart(3, '0')}`;

const SESSION_STARTED = { type: 'SESSION_STARTED', interview_session_id: SESSION_ID, total: 3 };

const questionReady = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: SESSION_ID,
  sequence,
  question_code: questionCode(sequence),
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: null,
  audio_status: 'UNAVAILABLE',
});

const answerAccepted = (sequence: number, sessionId = SESSION_ID) => ({
  type: 'ANSWER_ACCEPTED',
  interview_session_id: sessionId,
  question_code: questionCode(sequence),
  sequence,
});

const INTERVIEW_FINISHED = { type: 'INTERVIEW_FINISHED', interview_session_id: SESSION_ID };

const questionText = (sequence: number) => `${sequence}번째 기술 면접 질문입니다.`;

// ──────────────────────────────────────────────
// STOMP 소켓 컨트롤러
// ──────────────────────────────────────────────

interface InterviewSocket {
  current: WebSocketRoute | null;
  connections: number;
  /** 재연결(2번째 이후 연결)에 CONNECTED를 바로 응답할지 */
  acceptReconnect: boolean;
  /** 클라이언트가 SEND한 destination 목록 */
  sentDestinations: string[];
  disconnectFrames: number;
  send: (payload: object) => void;
}

async function setupInterviewSocket(
  page: Page,
  { onStart = 'question' }: { onStart?: 'question' | 'error' } = {},
): Promise<InterviewSocket> {
  const socket: InterviewSocket = {
    current: null,
    connections: 0,
    acceptReconnect: true,
    sentDestinations: [],
    disconnectFrames: 0,
    send(payload) {
      socket.current?.send(stompMessage('/user/queue/interviews', payload));
    },
  };

  await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
    socket.connections += 1;
    const connectionIndex = socket.connections;
    socket.current = ws;

    ws.onMessage((data) => {
      const frame = frameToString(data as string | Buffer);

      if (frame.startsWith('CONNECT')) {
        if (connectionIndex === 1 || socket.acceptReconnect) ws.send(stompConnected());
        if (connectionIndex === 1 && onStart === 'error') {
          setTimeout(
            () => ws.send(stompError('면접을 시작할 수 없습니다. 다시 시도해 주세요.')),
            50,
          );
        }
      }

      if (frame.startsWith('DISCONNECT')) socket.disconnectFrames += 1;

      if (frame.startsWith('SEND')) {
        const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
        socket.sentDestinations.push(destination);
        if (destination === '/app/interviews/start' && onStart === 'question') {
          ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          setTimeout(() => ws.send(stompMessage('/user/queue/interviews', questionReady(1))), 50);
        }
      }
    });
  });

  return socket;
}

// ──────────────────────────────────────────────
// 업로드 REST 목 (page.route)
// ──────────────────────────────────────────────

type UploadReply =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'empty'; status: number }
  | { kind: 'network-error' }
  | { kind: 'hold' };

/** src/mocks/handlers/interview.ts 의 envelope와 동일 */
const reply = {
  ok: (sequence = 1): UploadReply => ({
    kind: 'json',
    status: 200,
    body: {
      status: 'OK',
      code: 200,
      data: {
        interview_session_id: SESSION_ID,
        status: 'WAITING_FOR_QUESTION',
        question_code: questionCode(sequence),
        sequence,
      },
      message: 'OK',
    },
  }),
  error: (status: number, errorCode: string, message = '오류가 발생했습니다.'): UploadReply => ({
    kind: 'json',
    status,
    body: { status: errorCode, code: status, data: null, message },
  }),
  unauthorized: (): UploadReply => ({
    kind: 'json',
    status: 401,
    body: { status: 'UNAUTHORIZED', code: 401, data: null, message: '인증이 필요합니다.' },
  }),
  empty: (status: number): UploadReply => ({ kind: 'empty', status }),
  network: (): UploadReply => ({ kind: 'network-error' }),
  hold: (): UploadReply => ({ kind: 'hold' }),
};

interface CapturedUpload {
  url: URL;
  method: string;
  headers: Record<string, string>;
}

interface UploadMock {
  requests: CapturedUpload[];
  /** hold 응답으로 보류한 n번째(0부터) 요청에 응답한다. 이미 abort된 요청이면 조용히 무시한다. */
  release: (index: number, next: UploadReply) => Promise<void>;
}

function corsHeaders(route: Route): Record<string, string> {
  const origin = route.request().headers()['origin'] ?? 'http://localhost:3000';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'authorization, x-xsrf-token, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };
}

async function fulfillReply(route: Route, next: UploadReply) {
  if (next.kind === 'network-error') {
    await route.abort('failed');
    return;
  }
  if (next.kind === 'hold') return;
  if (next.kind === 'empty') {
    await route.fulfill({ status: next.status, headers: corsHeaders(route), body: '' });
    return;
  }
  await route.fulfill({
    status: next.status,
    contentType: 'application/json',
    headers: corsHeaders(route),
    body: JSON.stringify(next.body),
  });
}

/** replies를 순서대로 소비한다. 모두 소비하면 마지막 값을 반복한다. */
async function mockAudioUpload(page: Page, replies: UploadReply[]): Promise<UploadMock> {
  const requests: CapturedUpload[] = [];
  const held = new Map<number, Route>();

  await page.route(AUDIO_UPLOAD_ROUTE, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(route) });
      return;
    }

    const index = requests.length;
    requests.push({
      url: new URL(request.url()),
      method: request.method(),
      headers: await request.allHeaders(),
    });

    const next = replies[Math.min(index, replies.length - 1)] ?? reply.ok();
    if (next.kind === 'hold') {
      held.set(index, route);
      return;
    }
    await fulfillReply(route, next);
  });

  return {
    requests,
    async release(index, next) {
      const route = held.get(index);
      if (!route) throw new Error(`upload request #${index} is not held`);
      held.delete(index);
      try {
        await fulfillReply(route, next);
      } catch {
        // 클라이언트가 이미 abort한 요청 — 응답이 도착하지 못해도 된다.
      }
    },
  };
}

type ReissueMode = 'success' | 'fail' | 'hold';

interface ReissueMock {
  callsAfterUpload: number;
  release: () => Promise<void>;
}

/**
 * 업로드 이후의 /api/auth/reissue 응답을 제어한다.
 * 페이지 진입 시 ProtectedRouteGuard의 최초 재발급은 항상 성공시킨다.
 */
async function mockReissueAfterUpload(
  page: Page,
  upload: UploadMock,
  mode: ReissueMode,
): Promise<ReissueMock> {
  const heldRoutes: Route[] = [];
  const mock: ReissueMock = {
    callsAfterUpload: 0,
    async release() {
      for (const route of heldRoutes.splice(0)) {
        await route
          .fulfill({
            status: 200,
            contentType: 'application/json',
            headers: corsHeaders(route),
            body: JSON.stringify({
              status: 'OK',
              code: 200,
              data: { accessToken: REISSUED_ACCESS_TOKEN },
              message: 'OK',
            }),
          })
          .catch(() => undefined);
      }
    },
  };

  await page.route(REISSUE_ROUTE, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(route) });
      return;
    }

    if (upload.requests.length === 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: { accessToken: BOOTSTRAP_ACCESS_TOKEN },
          message: 'OK',
        }),
      });
      return;
    }

    mock.callsAfterUpload += 1;
    if (mode === 'hold') {
      heldRoutes.push(route);
      return;
    }
    if (mode === 'fail') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({
          status: 'UNAUTHORIZED',
          code: 401,
          data: null,
          message: '리프레시 토큰이 만료되었습니다.',
        }),
      });
      return;
    }
    heldRoutes.push(route);
    await mock.release();
  });

  return mock;
}

// ──────────────────────────────────────────────
// 브라우저 API 목 (getUserMedia / MediaRecorder / speechSynthesis / fetch 스파이)
// ──────────────────────────────────────────────

interface MediaMockOptions {
  /** 오디오 getUserMedia 결과. pending이면 resolvePendingMic() 호출 전까지 대기 */
  mic?: 'granted' | 'denied' | 'pending';
  hasMediaDevices?: boolean;
  hasMediaRecorder?: boolean;
  /** MediaRecorder.isTypeSupported()가 true를 돌려줄 MIME 목록 */
  supportedMimeTypes?: string[];
  /** onstop 직전 dataavailable로 전달할 Blob 크기(byte) */
  blobSize?: number;
}

interface UploadSpyRecord {
  url: string;
  method: string | null;
  isFormData: boolean;
  formKeys: string[];
  file: { name: string; type: string; size: number } | null;
  manualContentType: string | null;
  hasSignal: boolean;
}

interface MediaSnapshot {
  audioRequests: number;
  videoRequests: number;
  recorders: Array<{
    requestedMimeType: string | null;
    mimeType: string;
    state: string;
    startCalls: number;
    stopCalls: number;
    tracksEnded: boolean;
  }>;
  uploads: UploadSpyRecord[];
  speechRecognitionConstructed: number;
}

interface Stt119Control {
  snapshot: () => MediaSnapshot;
  setMic: (mode: 'granted' | 'denied' | 'pending') => void;
  resolvePendingMic: () => void;
  setRecorderStartFails: (fails: boolean) => void;
}

async function installMediaMocks(page: Page, options: MediaMockOptions = {}) {
  await page.addInitScript(
    (opts: Required<MediaMockOptions>) => {
      type PendingMic = {
        resolve: (stream: MediaStream) => void;
        reject: (error: unknown) => void;
      };

      const state = {
        micMode: opts.mic,
        recorderStartFails: false,
        audioRequests: 0,
        videoRequests: 0,
        pendingMic: [] as PendingMic[],
        recorders: [] as Array<{
          requestedMimeType: string | null;
          mimeType: string;
          state: string;
          startCalls: number;
          stopCalls: number;
          stream: MediaStream;
        }>,
        uploads: [] as UploadSpyRecord[],
        speechRecognitionConstructed: 0,
      };

      let audioContext: AudioContext | null = null;
      const createAudioStream = () => {
        audioContext ??= new AudioContext();
        return audioContext.createMediaStreamDestination().stream;
      };
      const createVideoStream = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const stream = canvas.captureStream(1);
        // 프레임이 없으면 <video srcObject>가 load 이벤트를 계속 지연시켜 page.goto가 멈출 수 있다.
        const paint = () => canvas.getContext('2d')?.fillRect(0, 0, 2, 2);
        paint();
        setTimeout(paint, 0);
        setTimeout(paint, 100);
        return stream;
      };
      const notAllowed = () => new DOMException('Permission denied', 'NotAllowedError');

      // ── navigator.mediaDevices ──
      if (!opts.hasMediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
      } else if (navigator.mediaDevices) {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          configurable: true,
          value: (constraints: MediaStreamConstraints = {}) => {
            if (constraints.video) {
              state.videoRequests += 1;
              return Promise.resolve(createVideoStream());
            }
            state.audioRequests += 1;
            if (state.micMode === 'denied') return Promise.reject(notAllowed());
            if (state.micMode === 'pending') {
              return new Promise<MediaStream>((resolve, reject) => {
                state.pendingMic.push({ resolve, reject });
              });
            }
            return Promise.resolve(createAudioStream());
          },
        });
      }

      // ── MediaRecorder ──
      class FakeMediaRecorder extends EventTarget {
        static isTypeSupported(type: string) {
          return opts.supportedMimeTypes.includes(type);
        }

        stream: MediaStream;
        mimeType: string;
        state: 'inactive' | 'recording' | 'paused' = 'inactive';
        ondataavailable: ((event: Event) => void) | null = null;
        onstop: ((event: Event) => void) | null = null;
        onstart: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        private record: (typeof state.recorders)[number];

        constructor(stream: MediaStream, options?: MediaRecorderOptions) {
          super();
          this.stream = stream;
          this.mimeType = options?.mimeType ?? opts.supportedMimeTypes[0] ?? '';
          this.record = {
            requestedMimeType: options?.mimeType ?? null,
            mimeType: this.mimeType,
            state: 'inactive',
            startCalls: 0,
            stopCalls: 0,
            stream,
          };
          state.recorders.push(this.record);
        }

        private emit(type: string, data?: Blob) {
          const event = new Event(type);
          if (data) Object.defineProperty(event, 'data', { value: data });
          const handler = (this as unknown as Record<string, ((e: Event) => void) | null>)[
            `on${type}`
          ];
          handler?.call(this, event);
          this.dispatchEvent(event);
        }

        start() {
          if (state.recorderStartFails) {
            throw new DOMException('Recorder start failed', 'NotSupportedError');
          }
          this.state = 'recording';
          this.record.state = 'recording';
          this.record.startCalls += 1;
          queueMicrotask(() => this.emit('start'));
        }

        stop() {
          if (this.state === 'inactive') return;
          this.state = 'inactive';
          this.record.state = 'inactive';
          this.record.stopCalls += 1;
          const type = this.mimeType || 'audio/webm';
          const blob = new Blob([new Uint8Array(opts.blobSize)], { type });
          queueMicrotask(() => {
            this.emit('dataavailable', blob);
            this.emit('stop');
          });
        }

        requestData() {}
        pause() {}
        resume() {}
      }

      Object.defineProperty(window, 'MediaRecorder', {
        configurable: true,
        writable: true,
        value: opts.hasMediaRecorder ? FakeMediaRecorder : undefined,
      });

      // ── speechSynthesis (질문 TTS 폴백 즉시 종료) ──
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          cancel() {},
          speak(utterance: SpeechSynthesisUtterance) {
            setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
          },
        },
      });

      // ── AC14: 브라우저 내장 음성 인식 생성 감지용 스파이 ──
      const recognitionName = ['Speech', 'Recognition'].join('');
      class RecognitionSpy {
        lang = '';
        continuous = false;
        interimResults = false;
        onresult = null;
        onend = null;
        onerror = null;
        constructor() {
          state.speechRecognitionConstructed += 1;
        }
        start() {}
        stop() {}
        abort() {}
      }
      for (const property of [recognitionName, `webkit${recognitionName}`]) {
        Object.defineProperty(window, property, { configurable: true, value: RecognitionSpy });
      }

      // ── 업로드 요청 FormData 스파이 ──
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (/\/answers\/audio/.test(url)) {
          const body = init?.body;
          const record: UploadSpyRecord = {
            url,
            method: init?.method ?? null,
            isFormData: body instanceof FormData,
            formKeys: [],
            file: null,
            manualContentType: new Headers(init?.headers).get('content-type'),
            hasSignal: Boolean(init?.signal),
          };
          if (body instanceof FormData) {
            record.formKeys = Array.from(body.keys());
            const file = body.get('file');
            if (file instanceof File) {
              record.file = { name: file.name, type: file.type, size: file.size };
            }
          }
          state.uploads.push(record);
        }
        return originalFetch(input, init);
      };

      const control: Stt119Control = {
        snapshot: () => ({
          audioRequests: state.audioRequests,
          videoRequests: state.videoRequests,
          recorders: state.recorders.map((recorder) => ({
            requestedMimeType: recorder.requestedMimeType,
            mimeType: recorder.mimeType,
            state: recorder.state,
            startCalls: recorder.startCalls,
            stopCalls: recorder.stopCalls,
            tracksEnded: recorder.stream.getTracks().every((track) => track.readyState === 'ended'),
          })),
          uploads: state.uploads.map((upload) => ({ ...upload })),
          speechRecognitionConstructed: state.speechRecognitionConstructed,
        }),
        setMic: (mode) => {
          state.micMode = mode;
        },
        resolvePendingMic: () => {
          for (const pending of state.pendingMic.splice(0)) {
            if (state.micMode === 'denied') pending.reject(notAllowed());
            else pending.resolve(createAudioStream());
          }
        },
        setRecorderStartFails: (fails) => {
          state.recorderStartFails = fails;
        },
      };
      (window as unknown as { __stt119: Stt119Control }).__stt119 = control;
    },
    {
      mic: options.mic ?? 'granted',
      hasMediaDevices: options.hasMediaDevices ?? true,
      hasMediaRecorder: options.hasMediaRecorder ?? true,
      supportedMimeTypes: options.supportedMimeTypes ?? ALL_MIME_TYPES,
      blobSize: options.blobSize ?? DEFAULT_BLOB_SIZE,
    },
  );
}

function mediaSnapshot(page: Page): Promise<MediaSnapshot> {
  return page.evaluate(() =>
    (window as unknown as { __stt119: Stt119Control }).__stt119.snapshot(),
  );
}

async function setMic(page: Page, mode: 'granted' | 'denied' | 'pending') {
  await page.evaluate(
    (next) => (window as unknown as { __stt119: Stt119Control }).__stt119.setMic(next),
    mode,
  );
}

// ──────────────────────────────────────────────
// 화면 헬퍼
// ──────────────────────────────────────────────

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const answerButton = (page: Page) => button(page, COPY.answer);
const submitButton = (page: Page) => button(page, COPY.submit);
const resubmitButton = (page: Page) => button(page, COPY.resubmit);
const rerecordButton = (page: Page) => button(page, COPY.rerecord);
const retryMicButton = (page: Page) => button(page, COPY.retryMic);
/** "다시 듣기"는 aria-label "질문 다시 듣기"를 쓰므로 부분 일치로 찾는다 (#118) */
const replayButton = (page: Page) => page.getByRole('button', { name: COPY.replay });
const startButton = (page: Page) => page.getByRole('button', { name: COPY.startButton });
const statusText = (page: Page, text: string) => page.getByRole('status').filter({ hasText: text });
const alertText = (page: Page, text: string) => page.getByRole('alert').filter({ hasText: text });

async function expectHiddenOrDisabled(locator: Locator) {
  await expect(async () => {
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      expect(await locator.nth(index).isDisabled()).toBe(true);
    }
  }).toPass({ timeout: 3000 });
}

async function checkAllChecklist(page: Page) {
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await checkboxes.nth(index).check();
  }
}

/** 시작 화면 통과 → 1번 질문 TTS 종료(idle) 까지 진행 */
async function startInterview(page: Page) {
  await page.goto(INTERVIEW_URL);
  await checkAllChecklist(page);
  await expect(startButton(page)).toBeEnabled({ timeout: 10_000 });
  await startButton(page).click();
  await expect(page.getByText(questionText(1))).toBeVisible({ timeout: 10_000 });
  await expect(answerButton(page)).toBeEnabled({ timeout: 10_000 });
}

async function startRecording(page: Page) {
  await answerButton(page).click();
  await expect(statusText(page, COPY.recording)).toBeVisible();
  await expect(submitButton(page)).toBeEnabled();
}

/** 1초 이상 녹음한 뒤 "제출하기" (AC2 Given) */
async function recordAndSubmit(page: Page) {
  await startRecording(page);
  await page.waitForTimeout(1300);
  await submitButton(page).click();
}

async function expectWaitingNextQuestion(page: Page) {
  await expect(statusText(page, COPY.waiting)).toBeVisible();
  for (const name of [COPY.answer, COPY.submit, COPY.resubmit, COPY.rerecord]) {
    await expectHiddenOrDisabled(button(page, name));
  }
  await expectHiddenOrDisabled(replayButton(page));
  await expect(button(page, COPY.reportError)).toBeEnabled();
}

async function expectRetryable(page: Page, message: string) {
  await expect(alertText(page, message)).toBeVisible();
  await expect(resubmitButton(page)).toBeEnabled();
  await expect(resubmitButton(page)).toBeFocused();
  await expect(rerecordButton(page)).toBeVisible();
  await expect(answerButton(page)).toHaveCount(0);
  await expect(statusText(page, COPY.waiting)).toHaveCount(0);
  // 텍스트 답변 폴백 UI는 없다
  await expect(page.getByRole('textbox')).toHaveCount(0);
}

/** AC6: phase idle + 녹음기 cancel() → 같은 질문에서 "답변하기"로 다시 녹음, 경과 시간 초기화 */
async function expectRerecordRequired(page: Page, message: string) {
  await expect(alertText(page, message)).toBeVisible();
  await expect(answerButton(page)).toBeEnabled();
  await expect(resubmitButton(page)).toHaveCount(0);
  await expect(rerecordButton(page)).toHaveCount(0);
  await expect(statusText(page, COPY.recording)).toHaveCount(0);
  await expect(page.getByText(ELAPSED_NON_ZERO)).toHaveCount(0);
}

// ══════════════════════════════════════════════
// AC1. 녹음 시작 — 브라우저별 녹음 포맷 선택
// ══════════════════════════════════════════════

test.describe('AC1: 녹음 시작 — 브라우저별 녹음 포맷 선택', () => {
  test('"답변하기" 클릭 시 오디오 스트림으로 녹음을 시작하고 녹음 중 표시·경과 시간·"제출하기"가 보인다', async ({
    page,
  }) => {
    // Given
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);
    const before = await mediaSnapshot(page);

    // When
    await answerButton(page).click();

    // Then
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(page.getByText(ELAPSED_JUST_STARTED).first()).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
    await expect(replayButton(page)).toHaveCount(0);

    const after = await mediaSnapshot(page);
    expect(after.audioRequests).toBe(before.audioRequests + 1);
    expect(after.recorders).toHaveLength(1);
    expect(after.recorders[0].requestedMimeType).toBe('audio/webm;codecs=opus');
    expect(after.recorders[0].state).toBe('recording');
  });

  const mimeCases = [
    {
      supported: ALL_MIME_TYPES,
      recorderMime: 'audio/webm;codecs=opus',
      file: 'answer.webm',
      type: 'audio/webm',
    },
    {
      supported: ['audio/webm', 'audio/mp4'],
      recorderMime: 'audio/webm',
      file: 'answer.webm',
      type: 'audio/webm',
    },
    {
      supported: ['audio/ogg;codecs=opus', 'audio/mp4'],
      recorderMime: 'audio/ogg;codecs=opus',
      file: 'answer.ogg',
      type: 'audio/ogg',
    },
    { supported: ['audio/mp4'], recorderMime: 'audio/mp4', file: 'answer.mp4', type: 'audio/mp4' },
  ];

  for (const mimeCase of mimeCases) {
    test(`지원 MIME 우선순위에 따라 ${mimeCase.recorderMime}로 녹음하고 ${mimeCase.file}(${mimeCase.type})로 업로드한다`, async ({
      page,
    }) => {
      // Given: 브라우저가 지원하는 MIME 목록
      await installMediaMocks(page, { supportedMimeTypes: mimeCase.supported });
      await setupInterviewSocket(page);
      await mockAudioUpload(page, [reply.ok()]);
      await startInterview(page);

      // When
      await recordAndSubmit(page);

      // Then
      await expect(statusText(page, COPY.waiting)).toBeVisible();
      const snapshot = await mediaSnapshot(page);
      expect(snapshot.recorders[0].requestedMimeType).toBe(mimeCase.recorderMime);
      expect(snapshot.uploads).toHaveLength(1);
      expect(snapshot.uploads[0].file).toEqual({
        name: mimeCase.file,
        type: mimeCase.type,
        size: DEFAULT_BLOB_SIZE,
      });
    });
  }

  test('STOMP 재연결 중(RECONNECTING)이어도 "답변하기"는 활성화되어 있다', async ({ page }) => {
    // Given: 질문 idle 상태에서 소켓이 끊기고 재연결이 끝나지 않음
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);
    socket.acceptReconnect = false;

    // When
    socket.current?.close();

    // Then
    await expect(page.getByText(/재연결/).first()).toBeVisible({ timeout: 5000 });
    await expect(answerButton(page)).toBeEnabled();
    await answerButton(page).click();
    await expect(statusText(page, COPY.recording)).toBeVisible();
  });
});

// ══════════════════════════════════════════════
// AC2. 수동 녹음 종료 및 업로드 성공 (200)
// ══════════════════════════════════════════════

test.describe('AC2: 수동 녹음 종료 및 업로드 성공 (200)', () => {
  test('"제출하기" 시 녹음을 끝내고 쿼리(question_code·sequence) + multipart(file만)로 업로드한 뒤 200이면 다음 질문 준비 중 상태가 된다', async ({
    page,
  }) => {
    // Given
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);

    // When
    await recordAndSubmit(page);

    // Then: 처리 중 상태 공통 표시
    await expect(statusText(page, COPY.processing)).toBeVisible();
    const submitting = button(page, COPY.submitting);
    await expect(submitting).toBeDisabled();
    await expect(submitting).toHaveAttribute('aria-busy', 'true');
    await expect(replayButton(page)).toHaveCount(0);
    await expect(statusText(page, COPY.recording)).toHaveCount(0);

    // Then: MediaRecorder.stop() + 트랙 해제
    await expect
      .poll(async () => (await mediaSnapshot(page)).recorders[0])
      .toMatchObject({ state: 'inactive', stopCalls: 1, tracksEnded: true });

    // Then: 요청 형식
    await expect.poll(() => upload.requests.length).toBe(1);
    const request = upload.requests[0];
    expect(request.method).toBe('POST');
    expect(request.url.pathname).toBe(`/api/interviews/${SESSION_ID}/answers/audio`);
    expect(request.url.searchParams.get('question_code')).toBe('Q001');
    expect(request.url.searchParams.get('sequence')).toBe('1');
    expect(request.headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.headers['authorization']).toBe(`Bearer ${BOOTSTRAP_ACCESS_TOKEN}`);
    expect(request.headers['x-xsrf-token']).toBeTruthy();

    const [spied] = (await mediaSnapshot(page)).uploads;
    expect(spied.isFormData).toBe(true);
    expect(spied.formKeys).toEqual(['file']);
    expect(spied.file).toEqual({
      name: 'answer.webm',
      type: 'audio/webm',
      size: DEFAULT_BLOB_SIZE,
    });
    expect(spied.manualContentType).toBeNull();
    expect(spied.hasSignal).toBe(true);

    // When: 200 응답
    await upload.release(0, reply.ok());

    // Then: 다음 질문 준비 중 상태 (답변 텍스트는 표시하지 않음)
    await expectWaitingNextQuestion(page);
    await expect(statusText(page, COPY.processing)).toHaveCount(0);

    // Then: STOMP 텍스트 답변 publish는 쓰지 않는다
    expect(socket.sentDestinations).not.toContain(`/app/interviews/${SESSION_ID}/answers`);
  });
});

// ══════════════════════════════════════════════
// AC3. 120초 자동 종료 후 업로드
// ══════════════════════════════════════════════

test.describe('AC3: 120초 자동 종료 후 업로드', () => {
  test('녹음 120초 도달 시 자동으로 녹음을 끝내고 한 번만 업로드하며 자동 제출 안내를 보여준다', async ({
    page,
  }) => {
    // Given
    await page.clock.install();
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await startRecording(page);

    // When: 120초 경과
    await page.clock.runFor(120_000);

    // Then: 자동 종료 + 업로드 + 자동 제출 안내
    await expect(statusText(page, COPY.autoSubmitted)).toBeVisible();
    await expect(statusText(page, COPY.processing)).toBeVisible();
    await expect.poll(() => upload.requests.length).toBe(1);
    const snapshot = await mediaSnapshot(page);
    expect(snapshot.recorders[0]).toMatchObject({
      state: 'inactive',
      stopCalls: 1,
      tracksEnded: true,
    });
    await expect(submitButton(page)).toHaveCount(0);

    // When: 200 응답
    await upload.release(0, reply.ok());

    // Then: 대기 화면, 자동 제출 안내는 사라짐, 업로드는 1회
    await expectWaitingNextQuestion(page);
    await expect(statusText(page, COPY.autoSubmitted)).toHaveCount(0);
    expect(upload.requests).toHaveLength(1);
  });

  test('자동 제출 후 400 INTERVIEW_ANSWER_TOO_LONG이면 재녹음 안내를 보여주고 경과 시간이 2:00에 머물지 않고 0:00부터 다시 시작한다', async ({
    page,
  }) => {
    // Given
    await page.clock.install();
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.error(400, 'INTERVIEW_ANSWER_TOO_LONG')]);
    await startInterview(page);
    await startRecording(page);

    // When
    await page.clock.runFor(120_000);

    // Then: AC6 재녹음 안내 + 경과 시간 초기화
    await expectRerecordRequired(page, COPY.tooLong);
    await expect(page.getByText(ELAPSED_MAXED)).toHaveCount(0);

    // When: 다시 녹음
    await answerButton(page).click();

    // Then: 새 녹음이 0:00부터 시작
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(page.getByText(ELAPSED_JUST_STARTED).first()).toBeVisible();
    await expect(alertText(page, COPY.tooLong)).toHaveCount(0);
    expect((await mediaSnapshot(page)).recorders).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════
// AC4. QUESTION_READY / INTERVIEW_FINISHED / ANSWER_ACCEPTED — 도착 순서 무관
// ══════════════════════════════════════════════

test.describe('AC4: STOMP 도착 순서 무관 처리', () => {
  test('200 후 QUESTION_READY(다음 sequence) 수신 시 새 질문이 표시되고 phase가 idle로 초기화된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expectWaitingNextQuestion(page);

    // When
    socket.send(questionReady(2));

    // Then
    await expect(page.getByText(questionText(2))).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);
  });

  test('[검증 시나리오 1] HTTP 200보다 ANSWER_ACCEPTED가 먼저 오면 대기 화면이 되고 뒤이은 200은 무시된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();

    // When: ANSWER_ACCEPTED 먼저
    socket.send(answerAccepted(1));

    // Then
    await expectWaitingNextQuestion(page);
    await expect(statusText(page, COPY.processing)).toHaveCount(0);

    // When: 늦은 200
    await expect.poll(() => upload.requests.length).toBe(1);
    await upload.release(0, reply.ok());
    await page.waitForTimeout(300);

    // Then: 그대로 대기 화면, 이후 다음 질문 정상 표시
    await expectWaitingNextQuestion(page);
    socket.send(questionReady(2));
    await expect(page.getByText(questionText(2))).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
  });

  test('이전 질문의 ANSWER_ACCEPTED가 다음 QUESTION_READY보다 늦게 오면 무시되어 새 질문 화면이 유지된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expectWaitingNextQuestion(page);
    socket.send(questionReady(2));
    await expect(page.getByText(questionText(2))).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();

    // When: 늦게 도착한 1번 질문의 ANSWER_ACCEPTED
    socket.send(answerAccepted(1));
    await page.waitForTimeout(300);

    // Then
    await expect(page.getByText(questionText(2))).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);
  });

  test('다른 세션 ID의 ANSWER_ACCEPTED는 무시된다', async ({ page }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();

    // When
    socket.send(answerAccepted(1, 'other-session-id'));
    await page.waitForTimeout(300);

    // Then: 여전히 처리 중
    await expect(statusText(page, COPY.processing)).toBeVisible();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);

    await expect.poll(() => upload.requests.length).toBe(1);
    await upload.release(0, reply.ok());
    await expectWaitingNextQuestion(page);
  });

  test('업로드 중 QUESTION_READY(다음 sequence)가 먼저 오면 새 질문이 idle로 표시되고 늦은 200은 무시된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();

    // When
    socket.send(questionReady(2));

    // Then
    await expect(page.getByText(questionText(2))).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.processing)).toHaveCount(0);

    // When: 이전 질문의 늦은 200
    await expect.poll(() => upload.requests.length).toBe(1);
    await upload.release(0, reply.ok(1));
    await page.waitForTimeout(300);

    // Then: 새 질문 idle 유지
    await expect(answerButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);
  });

  test('업로드 중 INTERVIEW_FINISHED가 오면 완료 화면으로 바뀌고 이후 업로드 응답은 무시된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();

    // When
    socket.send(INTERVIEW_FINISHED);

    // Then
    await expect(page.getByText(COPY.finished, { exact: true }).first()).toBeVisible();

    // 업로드 요청이 목에 도착(보류)한 뒤에 응답을 보낸다 (CSRF 조회 후 전송되므로 대기 필요)
    await expect.poll(() => upload.requests.length).toBe(1);
    await upload.release(0, reply.error(502, 'SPEECH_TRANSCRIPTION_FAILED'));
    await page.waitForTimeout(300);
    await expect(page.getByText(COPY.finished, { exact: true }).first()).toBeVisible();
    await expect(alertText(page, COPY.transcriptionFailed)).toHaveCount(0);
    await expect(resubmitButton(page)).toHaveCount(0);
  });

  test('[검증 시나리오 3] 업로드 중 STOMP가 끊긴(RECONNECTING) 상태에서 200을 받으면 대기 화면이 되고 재연결 후에도 유지된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();

    // Given: 재연결이 끝나지 않는 RECONNECTING
    socket.acceptReconnect = false;
    socket.current?.close();
    await expect(page.getByText(/재연결/).first()).toBeVisible({ timeout: 5000 });

    // When: 200
    await expect.poll(() => upload.requests.length).toBe(1);
    await upload.release(0, reply.ok());

    // Then
    await expectWaitingNextQuestion(page);

    // When: 재연결 완료 (store가 QUESTION으로 복구)
    await expect.poll(() => socket.connections, { timeout: 10_000 }).toBeGreaterThan(1);
    socket.current?.send(stompConnected());
    await expect(page.getByText(/재연결/)).toHaveCount(0, { timeout: 5000 });

    // Then: phase waiting이 우선순위 2로 이겨 대기 화면 유지
    await expectWaitingNextQuestion(page);
  });

  test('[검증 시나리오 4] retryable 상태에서 STOMP 재연결이 끝나도 "다시 제출"/"다시 녹음"을 계속 쓸 수 있고 같은 Blob으로 재업로드한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [
      reply.error(502, 'SPEECH_TRANSCRIPTION_FAILED'),
      reply.ok(),
    ]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expectRetryable(page, COPY.transcriptionFailed);

    // When: 소켓 끊김 → RECONNECTING (재제출 버튼은 막지 않는다)
    socket.acceptReconnect = false;
    socket.current?.close();
    await expect(page.getByText(/재연결/).first()).toBeVisible({ timeout: 5000 });
    await expect(resubmitButton(page)).toBeEnabled();
    await expect(rerecordButton(page)).toBeEnabled();

    // When: 재연결 완료
    await expect.poll(() => socket.connections, { timeout: 10_000 }).toBeGreaterThan(1);
    socket.current?.send(stompConnected());
    await expect(page.getByText(/재연결/)).toHaveCount(0, { timeout: 5000 });

    // Then: phase·Blob 유지
    await expect(alertText(page, COPY.transcriptionFailed)).toBeVisible();
    await expect(resubmitButton(page)).toBeEnabled();
    await expect(rerecordButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);

    // When: 다시 제출
    await resubmitButton(page).click();

    // Then: 같은 Blob으로 재업로드 → 200 → 대기
    await expectWaitingNextQuestion(page);
    expect(upload.requests).toHaveLength(2);
    const { uploads } = await mediaSnapshot(page);
    expect(uploads[1].file).toEqual(uploads[0].file);
  });
});

// ══════════════════════════════════════════════
// AC5. 너무 짧은 녹음 프론트 차단
// ══════════════════════════════════════════════

test.describe('AC5: 너무 짧은 녹음 프론트 차단', () => {
  test('(a) 1초 미만에서 "제출하기"를 누르면 업로드 없이 안내하고 마이크를 해제한 뒤 다시 녹음할 수 있다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);

    // When: 녹음 직후(1초 미만) 제출
    await answerButton(page).click();
    await submitButton(page).click();

    // Then
    await expect(alertText(page, COPY.tooShort)).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.recording)).toHaveCount(0);
    await expect(page.getByText(ELAPSED_NON_ZERO)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(upload.requests).toHaveLength(0);
    const snapshot = await mediaSnapshot(page);
    expect(snapshot.uploads).toHaveLength(0);
    expect(snapshot.recorders[0]).toMatchObject({ state: 'inactive', tracksEnded: true });

    // When: 같은 질문에서 다시 녹음 → 새 스트림
    await answerButton(page).click();

    // Then
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(alertText(page, COPY.tooShort)).toHaveCount(0);
    const next = await mediaSnapshot(page);
    expect(next.audioRequests).toBe(snapshot.audioRequests + 1);
    expect(next.recorders).toHaveLength(2);
  });

  test('(b) 녹음 종료 후 Blob이 0바이트면 업로드 없이 같은 안내를 보여준다', async ({ page }) => {
    await installMediaMocks(page, { blobSize: 0 });
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);

    // When
    await recordAndSubmit(page);

    // Then
    await expect(alertText(page, COPY.tooShort)).toBeVisible();
    await expect(answerButton(page)).toBeEnabled();
    await expect(page.getByText(ELAPSED_NON_ZERO)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(upload.requests).toHaveLength(0);
    expect((await mediaSnapshot(page)).recorders[0].tracksEnded).toBe(true);
  });
});

// ══════════════════════════════════════════════
// AC6. 다시 녹음이 필요한 오류 — 400 / 413 / 422
// ══════════════════════════════════════════════

test.describe('AC6: 다시 녹음이 필요한 오류 — 400 / 413 / 422', () => {
  const cases: Array<{ title: string; response: UploadReply; message: string }> = [
    {
      title: '400 INTERVIEW_ANSWER_AUDIO_INVALID',
      response: reply.error(400, 'INTERVIEW_ANSWER_AUDIO_INVALID'),
      message: COPY.audioInvalid,
    },
    {
      title: '400 INTERVIEW_ANSWER_TOO_LONG',
      response: reply.error(400, 'INTERVIEW_ANSWER_TOO_LONG'),
      message: COPY.tooLong,
    },
    { title: '400 본문 없음(기본 문구)', response: reply.empty(400), message: COPY.audioInvalid },
    {
      title: '413 INTERVIEW_ANSWER_AUDIO_TOO_LARGE',
      response: reply.error(413, 'INTERVIEW_ANSWER_AUDIO_TOO_LARGE'),
      message: COPY.tooLarge,
    },
    {
      title: '422 INTERVIEW_ANSWER_NOT_RECOGNIZED',
      response: reply.error(422, 'INTERVIEW_ANSWER_NOT_RECOGNIZED'),
      message: COPY.notRecognized,
    },
  ];

  for (const { title, response, message } of cases) {
    test(`${title} → 재녹음 안내 + phase idle + 경과 시간 초기화`, async ({ page }) => {
      await installMediaMocks(page);
      await setupInterviewSocket(page);
      const upload = await mockAudioUpload(page, [response]);
      await startInterview(page);

      // When
      await recordAndSubmit(page);

      // Then
      await expectRerecordRequired(page, message);
      expect(upload.requests).toHaveLength(1);
    });
  }

  test('422 후 "답변하기"로 같은 질문을 새로 녹음하면 안내가 지워지고 0:00부터 시작한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.error(422, 'INTERVIEW_ANSWER_NOT_RECOGNIZED'), reply.ok()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expectRerecordRequired(page, COPY.notRecognized);

    // When
    await answerButton(page).click();

    // Then
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(page.getByText(ELAPSED_JUST_STARTED).first()).toBeVisible();
    await expect(alertText(page, COPY.notRecognized)).toHaveCount(0);
    await expect(page.getByText(questionText(1))).toBeVisible();
  });
});

// ══════════════════════════════════════════════
// AC7. 상태 충돌 오류 — 409
// ══════════════════════════════════════════════

test.describe('AC7: 상태 충돌 오류 — 409', () => {
  test('409 INTERVIEW_ALREADY_COMPLETED → 면접 완료 화면으로 바뀌고 STOMP 연결을 종료한다(재연결 없음)', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.error(409, 'INTERVIEW_ALREADY_COMPLETED')]);
    await startInterview(page);

    // When
    await recordAndSubmit(page);

    // Then
    await expect(page.getByText(COPY.finished, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /답변하기|제출하기|다시 제출/ })).toHaveCount(0);
    await expect.poll(() => socket.disconnectFrames).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    expect(socket.connections).toBe(1);
  });

  test('409 INTERVIEW_QUESTION_NOT_READY → 재시도 없이 다음 질문 준비 중 상태가 된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.error(409, 'INTERVIEW_QUESTION_NOT_READY')]);
    await startInterview(page);

    // When
    await recordAndSubmit(page);

    // Then
    await expectWaitingNextQuestion(page);
    await page.waitForTimeout(300);
    expect(upload.requests).toHaveLength(1);

    socket.send(questionReady(2));
    await expect(page.getByText(questionText(2))).toBeVisible();
  });

  test('본문 없는 409 → NOT_READY와 같이 다음 질문 준비 중 상태가 된다', async ({ page }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.empty(409)]);
    await startInterview(page);

    await recordAndSubmit(page);

    await expectWaitingNextQuestion(page);
    expect(upload.requests).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════
// AC8. 음성 인식 제공자 한도 초과 — 429
// ══════════════════════════════════════════════

test.describe('AC8: 음성 인식 제공자 한도 초과 — 429', () => {
  test('429 → 자동 재시도 없이 retryable, "다시 제출"은 즉시 활성화되고 같은 Blob으로 재업로드한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [
      reply.error(429, 'SPEECH_PROVIDER_RATE_LIMITED'),
      reply.hold(),
    ]);
    await startInterview(page);

    // When
    await recordAndSubmit(page);

    // Then
    await expectRetryable(page, COPY.rateLimited);
    await page.waitForTimeout(500);
    expect(upload.requests).toHaveLength(1);

    // When: 다시 제출
    await resubmitButton(page).click();

    // Then: 즉시 처리 중(중복 클릭 차단) + 안내 지움 + 같은 Blob·같은 쿼리
    await expect(statusText(page, COPY.processing)).toBeVisible();
    await expect(button(page, COPY.submitting)).toBeDisabled();
    await expect(alertText(page, COPY.rateLimited)).toHaveCount(0);
    await expect.poll(() => upload.requests.length).toBe(2);
    expect(upload.requests[1].url.search).toBe(upload.requests[0].url.search);
    const { uploads } = await mediaSnapshot(page);
    expect(uploads[1].file).toEqual(uploads[0].file);

    await upload.release(1, reply.ok());
    await expectWaitingNextQuestion(page);
  });
});

// ══════════════════════════════════════════════
// AC9. 음성 변환 실패 — 502
// ══════════════════════════════════════════════

test.describe('AC9: 음성 변환 실패 — 502', () => {
  test('502가 연속 2회 와도 두 번 모두 retryable("다시 제출"·"다시 녹음")이고 다른 답변 방식으로 전환하지 않는다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [
      reply.error(502, 'SPEECH_TRANSCRIPTION_FAILED'),
      reply.error(502, 'SPEECH_TRANSCRIPTION_FAILED'),
    ]);
    await startInterview(page);

    // When: 1회차
    await recordAndSubmit(page);
    await expectRetryable(page, COPY.transcriptionFailed);

    // When: 2회차
    await resubmitButton(page).click();
    await expect.poll(() => upload.requests.length).toBe(2);

    // Then
    await expectRetryable(page, COPY.transcriptionFailed);
    const { uploads } = await mediaSnapshot(page);
    expect(uploads[1].file).toEqual(uploads[0].file);
  });

  test('본문 없는 인프라 502도 같은 retryable 안내를 보여준다', async ({ page }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.empty(502)]);
    await startInterview(page);

    await recordAndSubmit(page);

    await expectRetryable(page, COPY.transcriptionFailed);
  });

  test('[검증 시나리오 5] "다시 녹음"은 Blob을 버리고 새 녹음을 시작하며 녹음이 끊기지 않는다(cancel 미호출)', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [
      reply.error(502, 'SPEECH_TRANSCRIPTION_FAILED'),
      reply.ok(),
    ]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expectRetryable(page, COPY.transcriptionFailed);

    // When
    await rerecordButton(page).click();

    // Then: 새 녹음 시작
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
    await expect(alertText(page, COPY.transcriptionFailed)).toHaveCount(0);
    await expect(resubmitButton(page)).toHaveCount(0);

    // Then: 잠시 뒤에도 녹음이 유지된다 (retryable → idle 전이에서 cancel()이 호출되지 않음)
    await page.waitForTimeout(1300);
    await expect(statusText(page, COPY.recording)).toBeVisible();
    const snapshot = await mediaSnapshot(page);
    expect(snapshot.recorders).toHaveLength(2);
    expect(snapshot.recorders[1]).toMatchObject({
      state: 'recording',
      stopCalls: 0,
      tracksEnded: false,
    });
    expect(upload.requests).toHaveLength(1);

    // When: 새 녹음 제출
    await submitButton(page).click();

    // Then
    await expectWaitingNextQuestion(page);
    expect(upload.requests).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════
// AC10. 클라이언트 타임아웃 및 네트워크 오류
// ══════════════════════════════════════════════

test.describe('AC10: 클라이언트 타임아웃 및 네트워크 오류', () => {
  test('네트워크 오류(fetch reject) → retryable, "다시 제출"은 새 요청으로 성공한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.network(), reply.ok()]);
    await startInterview(page);

    await recordAndSubmit(page);
    await expectRetryable(page, COPY.network);

    // When
    await resubmitButton(page).click();

    // Then: abort된 이전 signal을 재사용하지 않아 재제출이 실제로 전송·성공한다
    await expectWaitingNextQuestion(page);
    expect(upload.requests).toHaveLength(2);
  });

  test('업로드 응답이 35초 안에 오지 않으면 즉시 retryable이 되고 늦게 온 200은 무시된다', async ({
    page,
  }) => {
    await page.clock.install();
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold(), reply.ok()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();
    await expect.poll(() => upload.requests.length).toBe(1);

    // When: 35초 경과
    await page.clock.runFor(35_000);

    // Then
    await expectRetryable(page, COPY.network);

    // When: 이전 요청의 늦은 200
    await upload.release(0, reply.ok());
    await page.waitForTimeout(300);

    // Then: 화면 변화 없음
    await expect(alertText(page, COPY.network)).toBeVisible();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);

    // When: 다시 제출 (새 AbortController·새 deadline)
    await resubmitButton(page).click();
    await expectWaitingNextQuestion(page);
  });

  test('[검증 시나리오] 401 후 토큰 재발급이 35초 넘게 지연되면 35초에 retryable이 되고, 이후 재발급·재시도 결과는 무시된다', async ({
    page,
  }) => {
    await page.clock.install();
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.unauthorized(), reply.ok()]);
    const reissue = await mockReissueAfterUpload(page, upload, 'hold');
    await startInterview(page);
    await recordAndSubmit(page);
    await expect(statusText(page, COPY.processing)).toBeVisible();
    await expect.poll(() => reissue.callsAfterUpload).toBe(1);

    // When: 재발급 대기 중 35초 경과
    await page.clock.runFor(35_000);

    // Then: 재발급을 기다리지 않고 즉시 retryable
    await expectRetryable(page, COPY.network);

    // When: 재발급 완료 → (재시도 결과가 오더라도)
    await reissue.release();
    await page.waitForTimeout(500);

    // Then: 화면은 바뀌지 않는다 (대기 화면·로그인 이동 없음)
    await expect(alertText(page, COPY.network)).toBeVisible();
    await expect(resubmitButton(page)).toBeEnabled();
    await expect(statusText(page, COPY.waiting)).toHaveCount(0);
    await expect(page).toHaveURL(/\/applicant\/interview/);
  });

  test('[검증 시나리오 2] 타임아웃으로 retryable이 된 뒤 ANSWER_ACCEPTED가 오면 대기 화면이 되고 Blob을 버린다', async ({
    page,
  }) => {
    await page.clock.install();
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.hold()]);
    await startInterview(page);
    await recordAndSubmit(page);
    await expect.poll(() => upload.requests.length).toBe(1);
    await page.clock.runFor(35_000);
    await expectRetryable(page, COPY.network);

    // When
    socket.send(answerAccepted(1));

    // Then
    await expectWaitingNextQuestion(page);
    await expect(alertText(page, COPY.network)).toHaveCount(0);
  });
});

// ══════════════════════════════════════════════
// AC11. 기타 서버 오류 — 5xx / 403 / 404
// ══════════════════════════════════════════════

test.describe('AC11: 기타 서버 오류 — 5xx / 403 / 404', () => {
  const cases: Array<{ title: string; response: UploadReply; message: string }> = [
    { title: '500', response: reply.error(500, 'INTERNAL_SERVER_ERROR'), message: COPY.server5xx },
    { title: '503', response: reply.error(503, 'SERVICE_UNAVAILABLE'), message: COPY.server5xx },
    { title: '504 (본문 없음)', response: reply.empty(504), message: COPY.server5xx },
    { title: '403', response: reply.error(403, 'FORBIDDEN'), message: COPY.client4xx },
    { title: '404', response: reply.error(404, 'NOT_FOUND'), message: COPY.client4xx },
  ];

  for (const { title, response, message } of cases) {
    test(`${title} → 자동 재시도 없이 retryable + 상태별 안내`, async ({ page }) => {
      await installMediaMocks(page);
      await setupInterviewSocket(page);
      const upload = await mockAudioUpload(page, [response]);
      await startInterview(page);

      await recordAndSubmit(page);

      await expectRetryable(page, message);
      await page.waitForTimeout(300);
      expect(upload.requests).toHaveLength(1);
      // "오류가 있어요" 버튼은 계속 쓸 수 있다
      await expect(button(page, COPY.reportError)).toBeEnabled();
    });
  }
});

// ══════════════════════════════════════════════
// AC12. 인증 만료 — 401
// ══════════════════════════════════════════════

test.describe('AC12: 인증 만료 — 401', () => {
  test('401 → 토큰 재발급 → 같은 FormData로 1회 재시도해 200이면 대기 화면이 된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.unauthorized(), reply.ok()]);
    const reissue = await mockReissueAfterUpload(page, upload, 'success');
    await startInterview(page);

    await recordAndSubmit(page);

    await expectWaitingNextQuestion(page);
    expect(reissue.callsAfterUpload).toBe(1);
    expect(upload.requests).toHaveLength(2);
    expect(upload.requests[1].headers['authorization']).toBe(`Bearer ${REISSUED_ACCESS_TOKEN}`);
    expect(upload.requests[1].url.search).toBe(upload.requests[0].url.search);
    // 같은 FormData라도 브라우저는 fetch마다 multipart boundary를 새로 만든다.
    // 따라서 헤더 문자열 대신 multipart 여부와 담긴 파일(같은 Blob)이 같은지 확인한다.
    expect(upload.requests[1].headers['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    const { uploads } = await mediaSnapshot(page);
    expect(uploads).toHaveLength(2);
    expect(uploads[1].formKeys).toEqual(['file']);
    expect(uploads[1].file).toEqual(uploads[0].file);
  });

  test('(a) 재시도 응답도 401이면 로그인 만료 토스트를 띄우고 /login으로 이동한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.unauthorized(), reply.unauthorized()]);
    await mockReissueAfterUpload(page, upload, 'success');
    await startInterview(page);

    await recordAndSubmit(page);

    await expect(page.getByText(COPY.sessionExpired)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(upload.requests).toHaveLength(2);
    await page.waitForTimeout(1500);
    expect(socket.connections).toBe(1);
  });

  test('(b) 토큰 재발급이 실패하면 로그인 만료 토스트를 띄우고 /login으로 이동한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.unauthorized()]);
    await mockReissueAfterUpload(page, upload, 'fail');
    await startInterview(page);

    await recordAndSubmit(page);

    await expect(page.getByText(COPY.sessionExpired)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(upload.requests).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════
// AC13. 마이크 권한·녹음 지원은 면접 시작 전제 조건
// ══════════════════════════════════════════════

test.describe('AC13 (A): 시작 화면 마이크 확인 게이트', () => {
  test('마이크 허용 + 체크리스트 완료 시에만 "면접 시작하기"가 활성화되고 사유 문구가 없다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);

    await expect(page.getByText('정상 작동 중이예요').last()).toBeVisible();
    await expect(startButton(page)).toBeDisabled();

    await checkAllChecklist(page);

    await expect(startButton(page)).toBeEnabled();
    await expect(startButton(page)).not.toHaveAttribute('aria-describedby', /.+/);
  });

  test('마이크 권한 거부 시 체크리스트를 모두 체크해도 시작할 수 없고, "다시 확인"으로 허용되면 시작할 수 있다', async ({
    page,
  }) => {
    // Given
    await installMediaMocks(page, { mic: 'denied' });
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);

    // When
    await checkAllChecklist(page);

    // Then
    await expect(page.getByText(COPY.micDeniedCard)).toBeVisible();
    await expect(startButton(page)).toBeDisabled();
    await expect(startButton(page)).toHaveAccessibleDescription(COPY.micDeniedReason);

    // When: 설정에서 허용 후 "다시 확인"
    await setMic(page, 'granted');
    const before = await mediaSnapshot(page);
    await button(page, COPY.recheckMic).click();

    // Then
    await expect(startButton(page)).toBeEnabled();
    await expect(page.getByText(COPY.micDeniedCard)).toHaveCount(0);
    expect((await mediaSnapshot(page)).audioRequests).toBe(before.audioRequests + 1);
  });

  test('MediaRecorder 미지원 브라우저면 "지원되지 않음" 태그·안내를 보여주고 getUserMedia를 호출하지 않으며 시작할 수 없다', async ({
    page,
  }) => {
    await installMediaMocks(page, { hasMediaRecorder: false });
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);
    await checkAllChecklist(page);

    await expect(page.getByText(COPY.unsupportedTag)).toBeVisible();
    await expect(page.getByText(COPY.unsupportedCard)).toBeVisible();
    await expect(startButton(page)).toBeDisabled();
    await expect(startButton(page)).toHaveAccessibleDescription(COPY.unsupportedReason);
    expect((await mediaSnapshot(page)).audioRequests).toBe(0);
  });

  test('지원 MIME이 하나도 없으면(isTypeSupported 모두 false) unsupported로 처리한다', async ({
    page,
  }) => {
    await installMediaMocks(page, { supportedMimeTypes: [] });
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);
    await checkAllChecklist(page);

    await expect(page.getByText(COPY.unsupportedTag)).toBeVisible();
    await expect(page.getByText(COPY.unsupportedCard)).toBeVisible();
    await expect(startButton(page)).toBeDisabled();
    expect((await mediaSnapshot(page)).audioRequests).toBe(0);
  });

  test('navigator.mediaDevices가 없으면 예외 없이 마이크 unsupported + 카메라 denied로 표시하고 시작할 수 없다', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await installMediaMocks(page, { hasMediaDevices: false });
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);
    await checkAllChecklist(page);

    await expect(page.getByText(COPY.unsupportedTag)).toBeVisible();
    await expect(page.getByText(COPY.cameraDeniedTag)).toBeVisible();
    await expect(startButton(page)).toBeDisabled();
    await expect(startButton(page)).toHaveAccessibleDescription(COPY.unsupportedReason);
    expect(pageErrors.map((error) => error.message)).toEqual([]);
  });

  test('마이크 확인 중(checking)에는 시작할 수 없고 "확인 중" 사유를 보여주며, 허용되면 활성화된다', async ({
    page,
  }) => {
    await installMediaMocks(page, { mic: 'pending' });
    await setupInterviewSocket(page);
    await page.goto(INTERVIEW_URL);
    await checkAllChecklist(page);

    // Then: checking
    await expect(startButton(page)).toBeDisabled();
    await expect(startButton(page)).toHaveAccessibleDescription(/확인 중/);
    await expect(page.getByText(COPY.micDeniedReason)).toHaveCount(0);

    // When: 권한 확인 완료
    await setMic(page, 'granted');
    await page.evaluate(() =>
      (window as unknown as { __stt119: Stt119Control }).__stt119.resolvePendingMic(),
    );

    // Then
    await expect(startButton(page)).toBeEnabled();
  });

  test('오류 화면에서 "면접 시작하기"를 누르면 시작 화면이 다시 마운트되어 마이크 확인·체크리스트가 처음부터 진행된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page, { onStart: 'error' });
    await page.goto(INTERVIEW_URL);
    await checkAllChecklist(page);
    await expect(startButton(page)).toBeEnabled();
    await startButton(page).click();
    await expect(page.getByText('면접을 시작할 수 없습니다').first()).toBeVisible({
      timeout: 10_000,
    });

    // Given: 오류 화면의 시작 화면도 마이크 게이트를 따른다
    await checkAllChecklist(page);
    await expect(startButton(page)).toBeEnabled();
    const before = await mediaSnapshot(page);

    // When
    await startButton(page).click();

    // Then: IDLE 시작 화면 재마운트 → 체크리스트 해제 + 마이크 재확인
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect(checkboxes.nth(index)).not.toBeChecked();
    }
    await expect(startButton(page)).toBeDisabled();
    await expect
      .poll(async () => (await mediaSnapshot(page)).audioRequests)
      .toBeGreaterThan(before.audioRequests);
  });
});

test.describe('AC13 (B): 면접 도중 녹음 시작 실패', () => {
  test('"답변하기" 시 getUserMedia가 실패하면 안내 + "다시 시도"를 보여주고, 재시도 성공 시 녹음이 시작된다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    const upload = await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);

    // Given: 면접 도중 권한 철회
    await setMic(page, 'denied');

    // When
    await answerButton(page).click();

    // Then
    await expect(alertText(page, COPY.micUnavailable)).toBeVisible();
    await expect(retryMicButton(page)).toBeEnabled();
    await expect(retryMicButton(page)).toBeFocused();
    await expect(answerButton(page)).toHaveCount(0);
    await expect(statusText(page, COPY.recording)).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(button(page, COPY.reportError)).toBeEnabled();
    expect(upload.requests).toHaveLength(0);

    // When: 다시 실패
    await retryMicButton(page).click();
    await expect(alertText(page, COPY.micUnavailable)).toBeVisible();

    // When: 권한 복구 후 다시 시도
    await setMic(page, 'granted');
    await retryMicButton(page).click();

    // Then
    await expect(statusText(page, COPY.recording)).toBeVisible();
    await expect(alertText(page, COPY.micUnavailable)).toHaveCount(0);
    await expect(submitButton(page)).toBeEnabled();
  });

  test('MediaRecorder 시작이 실패해도 같은 안내 + "다시 시도"를 보여주고 스트림 트랙을 해제한다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);
    await page.evaluate(() =>
      (window as unknown as { __stt119: Stt119Control }).__stt119.setRecorderStartFails(true),
    );

    await answerButton(page).click();

    await expect(alertText(page, COPY.micUnavailable)).toBeVisible();
    await expect(retryMicButton(page)).toBeEnabled();
    await expect
      .poll(async () => (await mediaSnapshot(page)).recorders.every((r) => r.tracksEnded))
      .toBe(true);
  });
});

// ══════════════════════════════════════════════
// AC14. 기존 브라우저 STT 코드 제거
// ══════════════════════════════════════════════

const RECOGNITION_KEYWORD = ['Speech', 'Recognition'].join('');

test.describe('AC14: 기존 브라우저 STT 코드 제거', () => {
  test('면접 진행 중 브라우저 내장 음성 인식을 생성하지 않고, 텍스트 답변 UI·STOMP 텍스트 제출이 없다', async ({
    page,
  }) => {
    await installMediaMocks(page);
    const socket = await setupInterviewSocket(page);
    await mockAudioUpload(page, [reply.ok()]);
    await startInterview(page);

    await expect(page.getByRole('textbox')).toHaveCount(0);
    await recordAndSubmit(page);
    await expectWaitingNextQuestion(page);

    expect((await mediaSnapshot(page)).speechRecognitionConstructed).toBe(0);
    expect(socket.sentDestinations.some((destination) => destination.endsWith('/answers'))).toBe(
      false,
    );
  });

  test(`src/·e2e/ 전체에서 ${RECOGNITION_KEYWORD} 참조가 없고 질문 화면·page가 submitAnswer를 호출하지 않는다`, async () => {
    const repoRoot = path.resolve(test.info().config.rootDir, '..');
    const matches: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
          if (fs.readFileSync(fullPath, 'utf8').includes(RECOGNITION_KEYWORD)) {
            matches.push(path.relative(repoRoot, fullPath));
          }
        }
      }
    };
    walk(path.join(repoRoot, 'src'));
    walk(path.join(repoRoot, 'e2e'));

    expect(matches).toEqual([]);

    const interviewDir = path.join(repoRoot, 'src/app/applicant/interview');
    for (const file of ['page.tsx', '_components/interview-question-screen.tsx']) {
      const source = fs.readFileSync(path.join(interviewDir, file), 'utf8');
      expect(source, `${file}`).not.toMatch(/submitAnswer\s*\(/);
      expect(source, `${file}`).not.toMatch(/<Textarea\b|<textarea\b/);
    }
  });
});
