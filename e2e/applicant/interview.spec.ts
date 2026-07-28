import { type Page, type WebSocketRoute } from '@playwright/test';

import { test, expect } from '../fixtures/auth';

/**
 * AI 면접 WebSocket(STOMP) 인수 테스트 (#44)
 *
 * 커버 AC: AC1, AC2, AC2-a, AC3, AC3-a, AC4, AC5, AC5-a, AC7, AC8
 *
 * 전제:
 * - Next.js 앱이 http://localhost:3000 에서 실행 중이어야 한다.
 * - `/applicant/interview` 라우트가 존재하고 "면접 시작" 버튼이 렌더링된다.
 * - STOMP WebSocket 서버 주소: NEXT_PUBLIC_WS_URL 환경변수 (기본값 ws://api.piuda.site/ws)
 *
 * WebSocket 목킹 전략:
 * - Playwright page.routeWebSocket()으로 STOMP 프레임을 직접 시뮬레이션한다.
 * - STOMP 프레임 형식: "COMMAND\nheader:value\n\n{body}\0"
 * - 클라이언트가 보내는 SEND 프레임의 destination 헤더로 publish 경로를 검증한다.
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
  return `MESSAGE\ndestination:${destination}\ncontent-type:application/json\ncontent-length:${bodyStr.length}\n\n${bodyStr}\0`;
}

/**
 * STOMP ERROR 프레임 생성 — 서버 → 클라이언트 오류
 */
function stompError(message: string, isAuth = false): string {
  const body = JSON.stringify({ message, auth_error: isAuth });
  return `ERROR\nmessage:${message}\ncontent-type:application/json\n\n${body}\0`;
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
  await page.goto(INTERVIEW_URL);
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
            // 연이어 첫 번째 질문 전송
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
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

    // Then: 답변 입력 영역(textarea)이 활성화된다
    await expect(page.getByRole('textbox')).toBeEnabled({ timeout: 5000 });

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
            // 첫 번째 질문
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));

            // When: 동일한 sequence=1 QUESTION_READY 중복 전송
            setTimeout(() => {
              ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
            }, 300);
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

    // 300ms 대기 후에도 동일한 질문이 유지됨 (중복 메시지 무시됨)
    await page.waitForTimeout(500);
    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible();
  });

  test('현재 sequence보다 작은 sequence의 QUESTION_READY는 무시된다', async ({ page }) => {
    // Given: sequence 2 질문을 표시 중인 상태에서 sequence 1이 재수신됨
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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          if (destination.includes('/answers')) {
            ws.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
            // sequence 2 질문 전송
            ws.send(stompMessage('/user/queue/interviews', questionReady(2)));

            // When: 이후 오래된 sequence 1이 재도착
            setTimeout(() => {
              ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
            }, 200);
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
    await page.getByRole('textbox').fill('답변 내용입니다.');
    await page.getByRole('button', { name: '제출' }).click();

    // Then: sequence 2 질문이 표시된 후 sequence 1이 도착해도 sequence 2가 유지됨
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    await page.waitForTimeout(400);
    // 여전히 2번 질문이 표시됨 (1번 무시됨)
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible();
  });
});

// ──────────────────────────────────────────────
// AC3: 답변 제출 및 다음 질문 루프
// ──────────────────────────────────────────────

test.describe('AC3: 답변 제출 및 다음 질문 루프', () => {
  test('답변 입력 후 제출 버튼 클릭 시 answers 경로로 payload가 publish되고 입력 영역이 비활성화된다', async ({
    page,
  }) => {
    // Given
    let capturedAnswerPayload: {
      question_code?: string;
      sequence?: number;
      answer?: string;
    } | null = null;

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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          if (destination === `/app/interviews/${SESSION_ID}/answers`) {
            const bodyMatch = frame.match(/\n\n([\s\S]+?)\0/);
            try {
              capturedAnswerPayload = JSON.parse(bodyMatch?.[1] ?? '{}');
            } catch {
              capturedAnswerPayload = null;
            }
            // ANSWER_ACCEPTED 후 다음 질문
            ws.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
            ws.send(stompMessage('/user/queue/interviews', questionReady(2)));
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: 답변 입력 후 제출
    const textarea = page.getByRole('textbox');
    await textarea.fill('안녕하세요. 답변 내용입니다.');
    await page.getByRole('button', { name: '제출' }).click();

    // Then: 제출 직후 입력 영역이 비활성화된다 (SUBMITTING 상태)
    await expect(textarea).toBeDisabled({ timeout: 3000 });

    // Then: answers 경로로 올바른 payload가 전송됨
    await expect(async () => {
      expect(capturedAnswerPayload).not.toBeNull();
      expect(capturedAnswerPayload?.answer).toBe('안녕하세요. 답변 내용입니다.');
      expect(capturedAnswerPayload?.sequence).toBe(1);
      expect(capturedAnswerPayload?.question_code).toBe('Q001');
    }).toPass({ timeout: 5000 });

    // Then: ANSWER_ACCEPTED 후 다음 질문(sequence 2)이 표시됨
    await expect(page.getByText('2번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });
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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          // When: 마지막 답변 제출 후 ANSWER_ACCEPTED 없이 INTERVIEW_FINISHED
          if (destination.includes('/answers')) {
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

    await page.getByRole('textbox').fill('마지막 답변입니다.');
    await page.getByRole('button', { name: '제출' }).click();

    // Then: INTERVIEW_FINISHED 수신 → 면접 완료/종료 화면으로 전환
    await expect(
      page.getByRole('heading', { name: /면접\s*(완료|종료)/, exact: false }),
    ).toBeVisible({ timeout: 5000 });
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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          if (destination.includes('/answers')) {
            ws.send(stompMessage('/user/queue/interviews', answerAccepted(1)));
            // When: INTERVIEW_FINISHED 수신
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
    await page.getByRole('textbox').fill('마지막 답변입니다.');
    await page.getByRole('button', { name: '제출' }).click();

    // Then: 면접 완료/종료 화면으로 전환된다
    await expect(
      page.getByRole('heading', { name: /면접\s*(완료|종료)/, exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Then: 답변 제출 UI가 더 이상 표시되지 않는다 (FINISHED 상태, 세션 초기화됨)
    await expect(page.getByRole('textbox')).not.toBeVisible({ timeout: 3000 });
  });
});

// ──────────────────────────────────────────────
// AC5: 연결 실패 및 인증 오류
// ──────────────────────────────────────────────

test.describe('AC5: 연결 실패 및 인증 오류', () => {
  test('WebSocket 연결 오류 발생 시 "면접을 시작할 수 없습니다" 에러 메시지가 표시된다', async ({
    page,
  }) => {
    // Given: WebSocket 연결 자체가 실패하는 상황 (서버 미응답)
    await page.routeWebSocket(WS_URL_PATTERN, (ws) => {
      // 연결 즉시 종료하여 연결 실패 시뮬레이션
      ws.close();
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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
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
// AC7: 빈 답변 제출 방지
// ──────────────────────────────────────────────

test.describe('AC7: 빈 답변 제출 방지', () => {
  test('답변 입력 없이 제출 버튼 클릭 시 유효성 검사 메시지가 표시되고 WebSocket 메시지가 전송되지 않는다', async ({
    page,
  }) => {
    // Given: 질문이 표시된 상태
    let answerPublished = false;

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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          if (destination.includes('/answers')) {
            // 빈 답변 제출 시 이 블록이 실행되면 안 됨
            answerPublished = true;
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: 답변 입력 없이 제출 (빈 값)
    await page.getByRole('button', { name: '제출' }).click();

    // Then: 유효성 검사 메시지가 표시된다
    await expect(page.getByText('답변을 입력해 주세요', { exact: false })).toBeVisible({
      timeout: 3000,
    });

    // Then: WebSocket 메시지가 전송되지 않는다
    await page.waitForTimeout(300);
    expect(answerPublished).toBe(false);
  });

  test('공백만 입력 후 제출 시에도 유효성 검사 메시지가 표시된다', async ({ page }) => {
    // Given
    let answerPublished = false;

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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
          }

          if (destination.includes('/answers')) {
            answerPublished = true;
          }
        }
      });
    });

    await gotoInterviewWithAuth(page);
    await page.getByRole('button', { name: '면접 시작' }).click();

    await expect(page.getByText('1번째 기술 면접 질문입니다.', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    // When: 공백만 입력 후 제출
    await page.getByRole('textbox').fill('   ');
    await page.getByRole('button', { name: '제출' }).click();

    // Then: 유효성 검사 메시지 표시
    await expect(page.getByText('답변을 입력해 주세요', { exact: false })).toBeVisible({
      timeout: 3000,
    });

    await page.waitForTimeout(300);
    expect(answerPublished).toBe(false);
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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
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

    await page.waitForTimeout(200);

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
            ws.send(stompMessage('/user/queue/interviews', questionReady(1)));
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

    await page.waitForTimeout(100);

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
