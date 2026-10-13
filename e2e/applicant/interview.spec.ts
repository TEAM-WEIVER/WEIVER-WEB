import { type Page, type WebSocketRoute } from '@playwright/test';

import { test, expect } from '../fixtures/auth';
import {
  installInterviewMediaMocks,
  mockInterviewAudioUpload,
  recordAndSubmitAnswer,
} from '../fixtures/interview-audio';

/**
 * AI 면접 WebSocket(STOMP) 인수 테스트 (#44)
 *
 * 커버 AC: AC1, AC2, AC2-a, AC3, AC3-a, AC4, AC5, AC5-a, AC7, AC8
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `/applicant/interview` 라우트가 존재하고 "면접 시작" 버튼이 렌더링된다.
 * - STOMP WebSocket 서버 주소: NEXT_PUBLIC_WS_URL 환경변수 (기본값 ws://api.weiverai.com/ws)
 *
 * WebSocket 목킹 전략:
 * - Playwright page.routeWebSocket()으로 STOMP 프레임을 직접 시뮬레이션한다.
 * - STOMP 프레임 형식: "COMMAND\nheader:value\n\n{body}\0"
 * - 클라이언트가 보내는 SEND 프레임의 destination 헤더로 publish 경로를 검증한다.
 *
 * 답변 제출(#119): 답변은 녹음 업로드(REST)로만 보낸다. 브라우저 녹음 API는
 * e2e/fixtures/interview-audio.ts의 getUserMedia/MediaRecorder 목을 쓰고,
 * 업로드 응답 이후의 STOMP 메시지는 업로드 목 콜백에서 보낸다.
 */

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────

const INTERVIEW_URL = '/applicant/interview';
const WS_URL_PATTERN = /ws(s)?:\/\/.+\/ws/;

const SESSION_ID = 'session-abc-123';

// ──────────────────────────────────────────────
// STOMP 프레임 빌더 헬퍼
// ──────────────────────────────────────────────

/**
 * STOMP CONNECTED 프레임 생성 — 클라이언트 CONNECT에 대한 서버 응답
 */
function stompConnected(): string {
  return 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0';
}

/**
 * STOMP MESSAGE 프레임 생성 — 서버 → 클라이언트 메시지
 */
function stompMessage(destination: string, body: object): string {
  const bodyStr = JSON.stringify(body);
  const contentLength = Buffer.byteLength(bodyStr, 'utf8');
  return `MESSAGE\ndestination:${destination}\nsubscription:sub-0\nmessage-id:mock-${Date.now()}\ncontent-type:application/json\ncontent-length:${contentLength}\n\n${bodyStr}\0`;
}

/**
 * STOMP ERROR 프레임 생성 — 서버 → 클라이언트 오류
 */
function stompError(message: string, isAuth = false): string {
  const body = JSON.stringify({ message, auth_error: isAuth });
  return `ERROR\nmessage:${message}\ncontent-type:application/json\n\n${body}\0`;
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

/**
 * Playwright WebSocket onMessage 콜백의 data를 문자열로 변환
 * data는 string | Buffer 타입임
 */
function frameToString(data: string | Buffer): string {
  if (typeof data === 'string') return data;
  return data.toString('utf-8');
}

// ──────────────────────────────────────────────
// 메시지 페이로드
// ──────────────────────────────────────────────

const SESSION_STARTED = {
  type: 'SESSION_STARTED',
  interview_session_id: SESSION_ID,
  total: 3,
};

const questionReady = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: SESSION_ID,
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
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
// 헬퍼
// ──────────────────────────────────────────────

/**
 * 인증된 사용자 상태로 면접 페이지 진입
 */
async function gotoInterviewWithAuth(page: Page) {
  // 시작 화면 마이크 게이트(#119 AC13 (A))를 통과하도록 마이크 허용 + MediaRecorder 목
  await installInterviewMediaMocks(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        speak(utterance: SpeechSynthesisUtterance) {
          setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
        },
      },
    });
  });

  await page.goto(INTERVIEW_URL);

  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(3);

  for (let index = 0; index < 3; index += 1) {
    await checkboxes.nth(index).check();
  }

  await expect(page.getByRole('button', { name: '면접 시작' })).toBeEnabled();
}

async function submitSpokenAnswer(page: Page) {
  await recordAndSubmitAnswer(page);
}

// ──────────────────────────────────────────────
// AC1: WebSocket 연결 및 세션 시작
// ──────────────────────────────────────────────

test.describe('AC1: WebSocket 연결 및 세션 시작', () => {
  test('면접 시작 버튼 클릭 시 STOMP 연결 후 SESSION_STARTED 수신으로 질문 대기 화면이 표시된다', async ({
    page,
  }) => {
    // Given: 인증된 사용자가 면접 시작 화면에 진입
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When: 면접 시작 버튼 클릭
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 상태가 CONNECTING → SUBSCRIBED → QUESTION으로 전이되며
    // 면접 시작 버튼이 비활성화된다 (진행 중 상태)
    await expect(page.getByRole('button', { name: '면접 시작' })).toBeDisabled({ timeout: 5000 });
  });

  test('CONNECT 프레임에 Authorization Bearer 토큰이 포함된다', async ({ page }) => {
    // Given
    let capturedAuthHeader: string | null = null;

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          const authMatch = frame.match(/Authorization:(.+)/);
          capturedAuthHeader = authMatch?.[1]?.trim() ?? null;
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';
          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: CONNECT 프레임에 Bearer 토큰이 포함됨
    await expect(async () => {
      expect(capturedAuthHeader).toMatch(/^Bearer .+/);
    }).toPass({ timeout: 5000 });
  });

  test('/app/interviews/start 경로로 TECHNICAL 타입을 publish한다', async ({ page }) => {
    // Given
    let startPayload: { interview_type?: string } | null = null;

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            const bodyMatch = frame.match(/\n\n([\s\S]+?)\0/);
            try {
              startPayload = JSON.parse(bodyMatch?.[1] ?? '{}');
            } catch {
              startPayload = null;
            }
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: payload에 interview_type: "TECHNICAL" 포함
    await expect(async () => {
      expect(startPayload).not.toBeNull();
      expect((startPayload as { interview_type?: string })?.interview_type).toBe('TECHNICAL');
    }).toPass({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// AC2: 질문 수신 및 표시
// ──────────────────────────────────────────────

test.describe('AC2: 질문 수신 및 표시', () => {
  test('QUESTION_READY 메시지 수신 시 질문 텍스트가 화면에 표시되고 답변 입력 영역이 활성화된다', async ({
    page,
  }) => {
    // Given: SESSION_STARTED 이후 QUESTION_READY 즉시 수신
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When: 면접 시작
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 질문 텍스트가 화면에 표시된다
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: 음성 답변 시작 버튼이 활성화된다
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled({ timeout: 5000 });

    // Then: 질문 순서 UI에 "질문 1"이 반영된다
    await expect(page.getByText(/질문\s*1/, { exact: false })).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// AC2-a: 중복 질문 메시지 방어
// ──────────────────────────────────────────────

test.describe('AC2-a: 중복 질문 메시지 방어', () => {
  test('동일한 session_id + sequence의 QUESTION_READY가 재전달되어도 화면 상태가 변경되지 않는다', async ({
    page,
  }) => {
    // Given: sequence 1 질문을 먼저 수신하여 화면에 표시 중인 상태
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));

            // When: 동일한 sequence=1 QUESTION_READY 중복 전송
            setTimeout(() => {
              ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
            }, 50);
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 첫 번째 질문이 표시된다
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 중복 메시지 수신 후에도 동일한 질문이 유지됨
    await page.waitForTimeout(100);
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible();
  });

  test('현재 sequence보다 작은 sequence의 QUESTION_READY는 무시된다', async ({ page }) => {
    // Given: sequence 2 질문을 표시 중인 상태에서 sequence 1이 재수신됨
    let socket: WebSocketRoute | null = null;
    await mockInterviewAudioUpload(page, () => {
      if (!socket) return;
      socket.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
      sendInterviewMessage(socket, questionReady(2));

      // When: 이후 오래된 sequence 1이 재도착
      const ws = socket;
      setTimeout(() => {
        ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
      }, 100);
    });
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      socket = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    // 질문 1에 답변
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await submitSpokenAnswer(page);

    // Then: sequence 2 질문이 표시된 후 sequence 1이 도착해도 sequence 2가 유지됨
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    await page.waitForTimeout(100);
    // 여전히 2번 질문이 표시됨 (1번 무시됨)
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible();
  });
});

// ──────────────────────────────────────────────
// AC3: 답변 제출 및 다음 질문 루프
// ──────────────────────────────────────────────

test.describe('AC3: 답변 제출 및 다음 질문 루프', () => {
  test('녹음 답변 제출 시 현재 질문 키로 오디오를 업로드하고 STOMP 텍스트 답변은 publish하지 않는다', async ({
    page,
  }) => {
    // Given
    const sentDestinations: string[] = [];
    let socket: WebSocketRoute | null = null;
    const upload = await mockInterviewAudioUpload(page, () => {
      if (!socket) return;
      // ANSWER_ACCEPTED 후 다음 질문
      socket.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
      socket.send(stompMessage('/user/queue/interviews', questionReady(2)));
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      socket = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';
          sentDestinations.push(destination);

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: 녹음 답변 시작 후 제출
    await submitSpokenAnswer(page);

    // Then: 현재 질문의 question_code·sequence로 오디오 업로드가 전송됨
    await expect.poll(() => upload.uploads.length, { timeout: 5000 }).toBe(1);
    expect(upload.uploads[0].url.pathname).toBe(`/api/interviews/${SESSION_ID}/answers/audio`);
    expect(upload.uploads[0].questionCode).toBe('Q001');
    expect(upload.uploads[0].sequence).toBe('1');

    // Then: ANSWER_ACCEPTED 후 다음 질문(sequence 2)이 표시됨
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: STOMP 텍스트 답변 경로는 쓰지 않는다
    expect(sentDestinations).not.toContain(`/app/interviews/${SESSION_ID}/answers`);
  });
});

// ──────────────────────────────────────────────
// AC3-a: 마지막 답변 후 INTERVIEW_FINISHED 직접 수신
// ──────────────────────────────────────────────

test.describe('AC3-a: 마지막 답변 후 INTERVIEW_FINISHED 직접 수신', () => {
  test('ANSWER_ACCEPTED 없이 INTERVIEW_FINISHED가 도착하면 바로 면접 종료 화면으로 전환된다', async ({
    page,
  }) => {
    // Given: 마지막 질문 답변 제출 → ANSWER_ACCEPTED 없이 INTERVIEW_FINISHED 수신
    let socket: WebSocketRoute | null = null;
    // When: 마지막 답변 업로드 후 ANSWER_ACCEPTED 없이 INTERVIEW_FINISHED
    await mockInterviewAudioUpload(page, () => {
      socket?.send(stompMessage('/user/queue/interviews', INTERVIEW_FINISHED));
    });
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      socket = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    await submitSpokenAnswer(page);

    // Then: INTERVIEW_FINISHED 수신 → 면접 완료/종료 화면으로 전환
    await expect(page.getByText('면접이 완료되었어요.', { exact: true }).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

// ──────────────────────────────────────────────
// AC4: 면접 종료 처리
// ──────────────────────────────────────────────

test.describe('AC4: 면접 종료 처리', () => {
  test('INTERVIEW_FINISHED 수신 시 완료 화면으로 전환되고 답변 입력 UI가 사라진다', async ({
    page,
  }) => {
    // Given: 모든 질문-답변 루프 완료 후 INTERVIEW_FINISHED 수신
    let socket: WebSocketRoute | null = null;
    await mockInterviewAudioUpload(page, () => {
      if (!socket) return;
      socket.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
      sendInterviewMessage(socket, INTERVIEW_FINISHED);
    });
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      socket = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await submitSpokenAnswer(page);

    // Then: 면접 완료/종료 화면으로 전환된다
    await expect(page.getByText('면접이 완료되었어요.', { exact: true }).first()).toBeVisible({
      timeout: 5000,
    });

    // Then: 답변 제출 UI가 더 이상 표시되지 않는다
    await expect(page.getByRole('button', { name: /답변하기|제출하기/ })).toHaveCount(0);
  });
});

// ──────────────────────────────────────────────
// AC5: 연결 실패 및 인증 오류
// ──────────────────────────────────────────────

test.describe('AC5: 연결 실패 및 인증 오류', () => {
  test('세션 시작 중 STOMP 오류 발생 시 "면접을 시작할 수 없습니다" 에러 메시지가 표시된다', async ({
    page,
  }) => {
    // Given: 연결 직후 서버가 일반 STOMP 오류를 반환하는 상황
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
          setTimeout(() => {
            ws.send(stompError('면접을 시작할 수 없습니다. 다시 시도해 주세요.'));
          }, 50);
        }
      });
    });

    await gotoInterviewWithAuth(page);

    // When: 면접 시작 버튼 클릭
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 에러 메시지가 화면에 표시된다
    await expect(page.getByText('면접을 시작할 수 없습니다', { exact: false })).toBeVisible({
      timeout: 5000,
    });
  });

  test('STOMP ERROR 프레임에서 인증 오류 감지 시 /login으로 리다이렉트된다', async ({ page }) => {
    // Given: STOMP ERROR 프레임에 인증 오류 정보 포함
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          // CONNECTED 응답 후 즉시 인증 오류 ERROR 프레임
          ws.send(stompConnected());
          ws.send(stompError('Unauthorized: 토큰이 만료되었거나 유효하지 않습니다.', true));
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    // Then: 인증 오류 감지 → /login으로 리다이렉트
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// AC5-a: STOMP ERROR 프레임 처리 (면접 진행 중)
// ──────────────────────────────────────────────

test.describe('AC5-a: 면접 진행 중 STOMP ERROR 프레임 처리', () => {
  test('면접 진행 중 STOMP ERROR 수신 시 에러 내용이 화면에 표시된다', async ({ page }) => {
    // Given: 세션 시작 후 질문 표시 중 STOMP ERROR 발생
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
            // When: 질문 표시 중 서버에서 STOMP ERROR 프레임 전송
            setTimeout(() => {
              ws.send(stompError('서버 내부 오류가 발생했습니다.'));
            }, 500);
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // Then: ERROR 프레임 수신 후 에러 메시지가 화면에 표시된다
    await expect(
      page.getByText(/서버 내부 오류|면접을 시작할 수 없습니다|다시 시도/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// AC7: 빈 답변 제출 — #119 AC5로 대체
// 텍스트(STOMP) 답변이 없어져 "빈 문자열 answer 전송"은 더 이상 존재하지 않는다.
// 녹음이 1초 미만이면 업로드하지 않고 다시 녹음을 안내한다.
// ──────────────────────────────────────────────

test.describe('AC7: 빈 답변 제출 (#119 AC5로 대체)', () => {
  test('녹음 직후(1초 미만) 제출하면 업로드·STOMP 답변 전송 없이 다시 녹음을 안내한다', async ({
    page,
  }) => {
    // Given: 질문이 표시된 상태
    const sentDestinations: string[] = [];
    const upload = await mockInterviewAudioUpload(page);

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';
          sentDestinations.push(destination);

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: 녹음을 시작하자마자 제출
    await page.getByRole('button', { name: '답변하기' }).click();
    await page.getByRole('button', { name: '제출하기' }).click();

    // Then: 너무 짧은 답변 안내 + 같은 질문에서 다시 녹음 가능
    await expect(
      page.getByRole('alert').filter({ hasText: '답변이 너무 짧아요. 다시 녹음해 주세요.' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '답변하기' })).toBeEnabled();
    await page.waitForTimeout(300);
    expect(upload.uploads).toHaveLength(0);
    expect(sentDestinations).not.toContain(`/app/interviews/${SESSION_ID}/answers`);
  });
});

// ──────────────────────────────────────────────
// AC8: 브라우저 탭 비활성화 복귀 시 소켓 상태 확인
// ──────────────────────────────────────────────

test.describe('AC8: 브라우저 탭 비활성화 복귀 시 소켓 상태 확인', () => {
  test('탭 비활성화 후 복귀 시 연결이 살아 있으면 기존 질문 상태를 유지한다', async ({ page }) => {
    // Given: 면접 진행 중(QUESTION 상태)에서 탭 전환 후 복귀
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: visibilitychange 이벤트로 탭 비활성화 → 복귀 시뮬레이션
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Then: 연결이 살아 있으면 기존 질문 상태가 유지된다
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 3000,
    });

    // Then: 재연결 배너가 표시되지 않는다
    await expect(page.getByRole('status', { name: /재연결/, exact: false })).not.toBeVisible({
      timeout: 2000,
    });
  });

  test('탭 복귀 시 소켓이 끊겨 있으면 RECONNECTING 배너가 표시된다', async ({ page }) => {
    // Given: 면접 진행 중 소켓이 끊긴 후 탭 복귀
    let wsRef: WebSocketRoute | null = null;

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      wsRef = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (frame.startsWith('SEND')) {
          const destinationMatch = frame.match(/destination:(.+)/);
          const destination = destinationMatch?.[1]?.trim() ?? '';

          if (destination === '/app/interviews/start') {
            ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
            sendInterviewMessage(ws, questionReady(1));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // 소켓 강제 종료로 연결 끊김 시뮬레이션
    if (wsRef) {
      (wsRef as WebSocketRoute).close();
    }

    // When: 탭 복귀 이벤트 발생
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Then: RECONNECTING 상태 UI(배너 또는 스피너)가 표시된다
    await expect(page.getByText(/재연결/, { exact: false })).toBeVisible({ timeout: 5000 });
  });
});

// ──────────────────────────────────────────────
// #114: 종료 후 대시보드에서 결과 선택 제출
// ──────────────────────────────────────────────

test.describe('#114: 종료 후 대시보드에서 결과 선택 제출', () => {
  test('완료 화면에서는 analysis를 요청하지 않고 대시보드로 이동한다', async ({ page }) => {
    let analysisRequestCount = 0;
    let analysisRequestBody: string | null = null;

    await page.route(`**/api/interviews/${SESSION_ID}/analysis`, async (route) => {
      analysisRequestCount += 1;
      analysisRequestBody = route.request().postData();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'OK',
          code: 200,
          data: {
            interview_session_id: SESSION_ID,
            status: 'TRANSCRIPT_SAVE_REQUESTED',
            next_available_interview_at: '2026-10-13T14:30:00',
          },
          message: '분석 요청이 접수되었습니다.',
        }),
      });
    });

    let socket: WebSocketRoute | null = null;
    await mockInterviewAudioUpload(page, () => {
      if (socket) sendInterviewMessage(socket, INTERVIEW_FINISHED);
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      socket = ws;
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);

        if (frame.startsWith('CONNECT')) {
          ws.send(stompConnected());
        }

        if (!frame.startsWith('SEND')) return;

        const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
        if (destination === '/app/interviews/start') {
          ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          sendInterviewMessage(ws, questionReady(1));
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    await submitSpokenAnswer(page);

    await page.getByRole('button', { name: '대시보드로 이동' }).first().click();

    await expect(page).toHaveURL(/\/applicant\/dashboard/);
    expect(analysisRequestCount).toBe(0);
    expect(analysisRequestBody).toBeNull();
  });
});

// ──────────────────────────────────────────────
// #101 AC6: 오류 리포트
// ──────────────────────────────────────────────

test.describe('#101 AC6: 면접 오류 리포트', () => {
  test('오류 내용을 입력해 보내면 현재 세션의 error-report API에 한 번 요청한다', async ({
    page,
  }) => {
    let reportRequestCount = 0;
    let reportRequestBody: string | null = null;

    await page.route(`**/api/interviews/${SESSION_ID}/error-report`, async (route) => {
      reportRequestCount += 1;
      reportRequestBody = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'OK', code: 200, data: 'received', message: 'OK' }),
      });
    });

    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      ws.onMessage((data) => {
        const frame = frameToString(data as string | Buffer);
        if (frame.startsWith('CONNECT')) ws.send(stompConnected());
        if (!frame.startsWith('SEND')) return;

        const destination = frame.match(/destination:(.+)/)?.[1]?.trim() ?? '';
        if (destination === '/app/interviews/start') {
          ws.send(stompMessage('/user/queue/interviews', SESSION_STARTED));
          sendInterviewMessage(ws, questionReady(1));
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();
    await expect(page.getByRole('button', { name: '오류가 있어요' })).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole('button', { name: '오류가 있어요' }).click();
    await page.getByRole('textbox').fill('질문 음성이 재생되지 않고 화면이 멈췄습니다.');
    await page.getByRole('button', { name: '오류 리포트 보내기' }).click();

    await expect.poll(() => reportRequestCount, { timeout: 5000 }).toBe(1);
    expect(reportRequestBody).toBe(
      JSON.stringify({ content: '질문 음성이 재생되지 않고 화면이 멈췄습니다.' }),
    );
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
