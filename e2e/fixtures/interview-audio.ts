import { expect, type Page, type Route } from '@playwright/test';

/**
 * AI 면접 답변 녹음 업로드(#119) 공통 e2e 목.
 *
 * - getUserMedia(audio/video) 허용 + MediaRecorder 대체 (시작 화면 마이크 게이트 통과용)
 * - `POST /api/interviews/{id}/answers/audio` 업로드 목 (200 envelope)
 * - 녹음 → 1초 이상 대기 → 제출 헬퍼
 *
 * 세부 시나리오(오류 응답, deadline 등)는 e2e/applicant/119-ai-stt-audio-upload.spec.ts 참고.
 */

const AUDIO_UPLOAD_ROUTE = /\/api\/interviews\/[^/]+\/answers\/audio(\?.*)?$/;

export interface InterviewMediaMockOptions {
  /** onstop 직전 dataavailable로 전달할 Blob 크기(byte) */
  blobSize?: number;
}

/** 마이크·카메라 권한 허용 + MediaRecorder 목 */
export async function installInterviewMediaMocks(
  page: Page,
  { blobSize = 4096 }: InterviewMediaMockOptions = {},
) {
  await page.addInitScript((size: number) => {
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

    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: (constraints: MediaStreamConstraints = {}) =>
          Promise.resolve(constraints.video ? createVideoStream() : createAudioStream()),
      });
    }

    const supportedMimeTypes = ['audio/webm;codecs=opus', 'audio/webm'];

    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported(type: string) {
        return supportedMimeTypes.includes(type);
      }

      stream: MediaStream;
      mimeType: string;
      state: 'inactive' | 'recording' | 'paused' = 'inactive';
      ondataavailable: ((event: Event) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;

      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        super();
        this.stream = stream;
        this.mimeType = options?.mimeType ?? supportedMimeTypes[0];
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
        this.state = 'recording';
      }

      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        const blob = new Blob([new Uint8Array(size)], { type: this.mimeType || 'audio/webm' });
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
      value: FakeMediaRecorder,
    });
  }, blobSize);
}

export interface CapturedAudioUpload {
  url: URL;
  questionCode: string | null;
  sequence: string | null;
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

/**
 * 답변 녹음 업로드를 200으로 응답한다. 응답을 보낸 뒤 `onUploaded`를 호출한다
 * (예: STOMP로 ANSWER_ACCEPTED / QUESTION_READY / INTERVIEW_FINISHED 전송).
 */
export async function mockInterviewAudioUpload(
  page: Page,
  onUploaded?: (upload: CapturedAudioUpload) => void,
) {
  const uploads: CapturedAudioUpload[] = [];

  await page.route(AUDIO_UPLOAD_ROUTE, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(route) });
      return;
    }

    const url = new URL(request.url());
    const upload: CapturedAudioUpload = {
      url,
      questionCode: url.searchParams.get('question_code'),
      sequence: url.searchParams.get('sequence'),
    };
    uploads.push(upload);

    const sessionId = url.pathname.split('/')[3] ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders(route),
      body: JSON.stringify({
        status: 'OK',
        code: 200,
        data: {
          interview_session_id: sessionId,
          status: 'WAITING_FOR_QUESTION',
          question_code: upload.questionCode,
          sequence: Number(upload.sequence),
        },
        message: 'OK',
      }),
    });
    onUploaded?.(upload);
  });

  return { uploads };
}

/** "답변하기" → 1초 이상 녹음(AC5 최소 길이) → "제출하기" */
export async function recordAndSubmitAnswer(page: Page) {
  const answerButton = page.getByRole('button', { name: '답변하기', exact: true });
  const submitButton = page.getByRole('button', { name: '제출하기', exact: true });

  await expect(answerButton).toBeEnabled({ timeout: 15_000 });
  await answerButton.click();
  await expect(submitButton).toBeEnabled();
  await page.waitForTimeout(1200);
  await submitButton.click();
}
