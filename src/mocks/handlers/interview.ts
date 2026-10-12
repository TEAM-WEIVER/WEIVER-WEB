/**
 * AI 면접 WebSocket(STOMP) 목 핸들러 (#44, #118, #119)
 *
 * WebSocket/STOMP 프로토콜은 MSW HTTP 핸들러로 직접 목킹할 수 없으므로,
 * 이 파일은 면접 세션에 필요한 보조 REST API 핸들러만 제공한다.
 *
 * WebSocket STOMP 메시지 시뮬레이션은 Playwright의 page.routeWebSocket()을
 * 각 e2e 테스트 케이스 안에서 직접 구현한다.
 */

import { delay, http, HttpResponse } from 'msw';

// ──────────────────────────────────────────────
// STOMP 메시지 페이로드 타입 정의 (테스트 참고용)
// ──────────────────────────────────────────────

/**
 * SESSION_STARTED 메시지 페이로드
 * - interview_session_id: 세션 식별자
 * - total: 전체 질문 수 (백엔드 협의 후 확정 — 없을 수 있음)
 */
export const SESSION_STARTED_PAYLOAD = {
  type: 'SESSION_STARTED',
  interview_session_id: 'session-abc-123',
  total: 5,
};

/**
 * QUESTION_READY 메시지 페이로드 (#44 기존 필드)
 * - sequence: 현재 질문 순서 (1부터 시작)
 * - question_code: 질문 식별 코드
 * - question: 질문 텍스트
 */
export const QUESTION_READY_PAYLOAD = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: 'session-abc-123',
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
});

/**
 * QUESTION_READY 메시지 페이로드 — audio_status: READY (#118 신규)
 *
 * 서버가 TTS 오디오를 준비한 경우. audio_url에 유효한 URL이 포함된다.
 * - audio_url: 서버 TTS 오디오 URL (30분 유효)
 * - audio_status: "READY"
 */
export const QUESTION_READY_WITH_AUDIO_PAYLOAD = (
  sequence: number,
  audioUrl = 'https://cdn.piuda.site/tts/mock-question.mp3',
) => ({
  type: 'QUESTION_READY',
  interview_session_id: 'session-abc-123',
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: audioUrl,
  audio_status: 'READY' as const,
});

/**
 * QUESTION_READY 메시지 페이로드 — audio_status: UNAVAILABLE (#118 신규)
 *
 * 서버가 TTS 오디오를 준비하지 못한 경우. 클라이언트는 speechSynthesis 폴백을 실행한다.
 * - audio_url: null
 * - audio_status: "UNAVAILABLE"
 */
export const QUESTION_READY_UNAVAILABLE_PAYLOAD = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: 'session-abc-123',
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: null,
  audio_status: 'UNAVAILABLE' as const,
});

/**
 * QUESTION_READY 메시지 페이로드 — audio_status: null (#118 신규)
 *
 * audio_status 필드가 null인 경우. UNAVAILABLE과 동일하게 speechSynthesis 폴백 처리.
 * - audio_url: null
 * - audio_status: null
 */
export const QUESTION_READY_NULL_STATUS_PAYLOAD = (sequence: number) => ({
  type: 'QUESTION_READY',
  interview_session_id: 'session-abc-123',
  sequence,
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  question: `${sequence}번째 기술 면접 질문입니다. 본인의 경험을 바탕으로 답변해 주세요.`,
  audio_url: null,
  audio_status: null,
});

/**
 * ANSWER_ACCEPTED 메시지 페이로드
 * - #119: setAnswerAccepted 가드가 interview_session_id·question_code·sequence를 비교한다.
 */
export const ANSWER_ACCEPTED_PAYLOAD = (sequence: number) => ({
  type: 'ANSWER_ACCEPTED',
  interview_session_id: 'session-abc-123',
  question_code: `Q${String(sequence).padStart(3, '0')}`,
  sequence,
});

/**
 * INTERVIEW_FINISHED 메시지 페이로드
 */
export const INTERVIEW_FINISHED_PAYLOAD = {
  type: 'INTERVIEW_FINISHED',
  interview_session_id: 'session-abc-123',
};

/**
 * STOMP ERROR 프레임 페이로드 — 인증 오류
 */
export const STOMP_AUTH_ERROR_PAYLOAD = {
  type: 'ERROR',
  message: 'Unauthorized: 토큰이 만료되었거나 유효하지 않습니다.',
  headers: {
    message: 'Unauthorized',
    'content-type': 'text/plain',
  },
};

/**
 * STOMP ERROR 프레임 페이로드 — 일반 서버 오류
 */
export const STOMP_GENERAL_ERROR_PAYLOAD = {
  type: 'ERROR',
  message: '서버 내부 오류가 발생했습니다.',
  headers: {
    message: 'Internal Server Error',
    'content-type': 'text/plain',
  },
};

// ──────────────────────────────────────────────
// 보조 REST API 핸들러 (면접 페이지 진입 시 필요)
// ──────────────────────────────────────────────

/**
 * 지원자 문서 상태 조회 — 면접 페이지 진입 시 레이아웃이 호출할 수 있음
 */
export const interviewPageHandlers = [
  http.get('https://api.piuda.site/api/applicants/document-status', () => {
    return HttpResponse.json({
      status: 'OK',
      code: 200,
      data: { resumeCompleted: true, essayCompleted: true, portfolioCompleted: true },
      message: 'OK',
    });
  }),
];

// ──────────────────────────────────────────────
// #119 답변 녹음 업로드 (POST /api/interviews/:id/answers/audio)
// ──────────────────────────────────────────────

const API_BASE = 'https://api.piuda.site';
const AUDIO_UPLOAD_URL = `${API_BASE}/api/interviews/:interviewSessionId/answers/audio`;
const REISSUE_URL = `${API_BASE}/api/auth/reissue`;

/** 401 후 재발급 시 내려주는 토큰. 재시도 요청 판별에 쓴다. */
export const REISSUED_ACCESS_TOKEN = 'reissued-access-token';

/** 35초 클라이언트 deadline보다 긴 재발급 지연 (AC10 검증 시나리오) */
export const DELAYED_REISSUE_MS = 36_000;

/**
 * 업로드 200 응답 — `ApiResponse<InterviewAnswerAudioResponseDTO>`
 * (OpenAPI 스펙 200 스키마 그대로. 인식 텍스트는 포함되지 않는다.)
 */
export const interviewAnswerAudioSuccessResponse = (
  interviewSessionId: string,
  questionCode: string,
  sequence: number,
) => ({
  status: 'OK',
  code: 200,
  data: {
    interview_session_id: interviewSessionId,
    status: 'WAITING_FOR_QUESTION',
    question_code: questionCode,
    sequence,
  },
  message: 'OK',
});

/**
 * 오류 응답 envelope.
 *
 * 스펙에 오류 본문 스키마가 없어, 성공 envelope `{ status, code, data, message }`와 같은 모양으로
 * `status`에 errorCode 문자열을 담는다. `api-client.ts` parseResponse는 `errorCode` → `status`
 * 문자열 순으로 읽어 `ApiError.apiStatus`에 넣고, `code`는 숫자일 때만 `ApiError.code`에 넣는다.
 */
export const interviewAudioErrorResponse = (
  httpStatus: number,
  errorCode: string,
  message: string,
) => ({
  status: errorCode,
  code: httpStatus,
  data: null,
  message,
});

export type InterviewAudioUploadScenario =
  /** AC2: 200 */
  | 'success'
  /** AC6: 400 INTERVIEW_ANSWER_AUDIO_INVALID */
  | 'audio-invalid'
  /** AC6: 400 INTERVIEW_ANSWER_TOO_LONG */
  | 'answer-too-long'
  /** AC6: 400 errorCode 없음(기본 문구) */
  | 'bad-request-no-code'
  /** AC6: 413 INTERVIEW_ANSWER_AUDIO_TOO_LARGE */
  | 'audio-too-large'
  /** AC6: 422 INTERVIEW_ANSWER_NOT_RECOGNIZED */
  | 'not-recognized'
  /** AC7: 409 INTERVIEW_QUESTION_NOT_READY */
  | 'question-not-ready'
  /** AC7: 409 INTERVIEW_ALREADY_COMPLETED */
  | 'already-completed'
  /** AC7: 본문 없는 409 */
  | 'conflict-no-body'
  /** AC8: 429 SPEECH_PROVIDER_RATE_LIMITED */
  | 'rate-limited'
  /** AC9: 502 SPEECH_TRANSCRIPTION_FAILED */
  | 'transcription-failed'
  /** AC9: 본문 없는 인프라 502 */
  | 'bad-gateway-no-body'
  /** AC11: 403 (4xx 문구) */
  | 'forbidden'
  /** AC11: 404 (4xx 문구) */
  | 'not-found'
  /** AC11: 500 (5xx 문구) */
  | 'server-error'
  /** AC11: 503 (5xx 문구) */
  | 'service-unavailable'
  /** AC10: 네트워크 오류(fetch reject) */
  | 'network-error'
  /** AC12: 401 → 재발급 성공 → 재시도 200 */
  | 'unauthorized-then-success'
  /** AC12 (a): 401 → 재발급 성공 → 재시도도 401 */
  | 'unauthorized-retry-unauthorized'
  /** AC12 (b): 401 → 재발급 실패 */
  | 'unauthorized-reissue-failed'
  /** AC10 검증 시나리오: 401 → 재발급이 35초 넘게 지연 → 이후 재시도 200 */
  | 'unauthorized-reissue-delayed';

type FixedErrorScenario = Exclude<
  InterviewAudioUploadScenario,
  | 'success'
  | 'conflict-no-body'
  | 'bad-gateway-no-body'
  | 'network-error'
  | 'unauthorized-then-success'
  | 'unauthorized-retry-unauthorized'
  | 'unauthorized-reissue-failed'
  | 'unauthorized-reissue-delayed'
>;

/** 시나리오별 고정 오류 응답 (HTTP 상태 + envelope) */
export const INTERVIEW_AUDIO_ERROR_RESPONSES: Record<
  FixedErrorScenario,
  { httpStatus: number; body: ReturnType<typeof interviewAudioErrorResponse> | null }
> = {
  'audio-invalid': {
    httpStatus: 400,
    body: interviewAudioErrorResponse(
      400,
      'INTERVIEW_ANSWER_AUDIO_INVALID',
      '지원하지 않는 오디오 형식이거나 빈 파일입니다.',
    ),
  },
  'answer-too-long': {
    httpStatus: 400,
    body: interviewAudioErrorResponse(
      400,
      'INTERVIEW_ANSWER_TOO_LONG',
      '답변 녹음이 허용 시간을 초과했습니다.',
    ),
  },
  'bad-request-no-code': { httpStatus: 400, body: null },
  'audio-too-large': {
    httpStatus: 413,
    body: interviewAudioErrorResponse(
      413,
      'INTERVIEW_ANSWER_AUDIO_TOO_LARGE',
      '오디오 파일은 최대 10MB까지 업로드할 수 있습니다.',
    ),
  },
  'not-recognized': {
    httpStatus: 422,
    body: interviewAudioErrorResponse(
      422,
      'INTERVIEW_ANSWER_NOT_RECOGNIZED',
      '음성이 인식되지 않았습니다.',
    ),
  },
  'question-not-ready': {
    httpStatus: 409,
    body: interviewAudioErrorResponse(
      409,
      'INTERVIEW_QUESTION_NOT_READY',
      '현재 답변을 받을 수 없는 상태입니다.',
    ),
  },
  'already-completed': {
    httpStatus: 409,
    body: interviewAudioErrorResponse(
      409,
      'INTERVIEW_ALREADY_COMPLETED',
      '이미 완료된 면접입니다.',
    ),
  },
  'rate-limited': {
    httpStatus: 429,
    body: interviewAudioErrorResponse(
      429,
      'SPEECH_PROVIDER_RATE_LIMITED',
      '음성 인식 요청 한도를 초과했습니다.',
    ),
  },
  'transcription-failed': {
    httpStatus: 502,
    body: interviewAudioErrorResponse(
      502,
      'SPEECH_TRANSCRIPTION_FAILED',
      '음성 변환에 실패했습니다.',
    ),
  },
  forbidden: {
    httpStatus: 403,
    body: interviewAudioErrorResponse(403, 'FORBIDDEN', '접근 권한이 없습니다.'),
  },
  'not-found': {
    httpStatus: 404,
    body: interviewAudioErrorResponse(404, 'NOT_FOUND', '면접 세션을 찾을 수 없습니다.'),
  },
  'server-error': {
    httpStatus: 500,
    body: interviewAudioErrorResponse(500, 'INTERNAL_SERVER_ERROR', '서버 오류가 발생했습니다.'),
  },
  'service-unavailable': {
    httpStatus: 503,
    body: interviewAudioErrorResponse(
      503,
      'SERVICE_UNAVAILABLE',
      '서비스를 일시적으로 사용할 수 없습니다.',
    ),
  },
};

const ALLOWED_AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4']);

/**
 * 요청 형식 검증 (AC2 / API 연동 "요청 상세").
 * - `question_code`, `sequence`는 쿼리 파라미터 (필수, sequence는 int)
 * - multipart 본문에는 `file` 하나만 담는다 (서버 허용 MIME, codecs 파라미터 없는 기본 MIME)
 * 형식이 어긋나면 서버와 같이 400 INTERVIEW_ANSWER_AUDIO_INVALID로 응답한다.
 */
async function validateAudioUploadRequest(request: Request) {
  const url = new URL(request.url);
  const questionCode = url.searchParams.get('question_code');
  const sequenceParam = url.searchParams.get('sequence');
  const sequence = Number(sequenceParam);

  if (!questionCode || sequenceParam === null || !Number.isInteger(sequence)) {
    return { ok: false as const };
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { ok: false as const };
  }

  const keys = Array.from(formData.keys());
  const file = formData.get('file');
  // jsdom/undici 등 실행 환경마다 File 생성자가 달라 instanceof 대신 형태로 판별한다.
  if (keys.length !== 1 || keys[0] !== 'file' || typeof file === 'string' || file === null) {
    return { ok: false as const };
  }
  if (file.size === 0) {
    return { ok: false as const };
  }
  if (!ALLOWED_AUDIO_MIME_TYPES.has(file.type)) {
    return { ok: false as const };
  }

  return { ok: true as const, questionCode, sequence };
}

function invalidAudioResponse() {
  const { httpStatus, body } = INTERVIEW_AUDIO_ERROR_RESPONSES['audio-invalid'];
  return HttpResponse.json(body, { status: httpStatus });
}

function unauthorizedResponse() {
  return HttpResponse.json(
    { status: 'UNAUTHORIZED', code: 401, data: null, message: '인증이 필요합니다.' },
    { status: 401 },
  );
}

function isRetryAfterReissue(request: Request) {
  return request.headers.get('Authorization') === `Bearer ${REISSUED_ACCESS_TOKEN}`;
}

/**
 * 업로드 시나리오별 핸들러를 만든다. 테스트·Storybook에서 `server.use(...)` /
 * `worker.use(...)`로 교체해 쓴다.
 *
 * 참고: vitest `jsdom` 환경에서는 jsdom File과 undici의 multipart 파서가 호환되지 않아
 * `request.formData()`가 실패한다. 이 핸들러를 단위 테스트에서 쓸 때는
 * `// @vitest-environment node`를 지정한다.
 *
 * 401 계열 시나리오는 `/api/auth/reissue` 핸들러를 함께 반환한다. 재시도 요청은
 * `Authorization: Bearer ${REISSUED_ACCESS_TOKEN}` 헤더로 구분한다.
 */
export function createInterviewAudioUploadHandlers(scenario: InterviewAudioUploadScenario) {
  if (scenario === 'network-error') {
    return [http.post(AUDIO_UPLOAD_URL, () => HttpResponse.error())];
  }

  if (scenario === 'conflict-no-body' || scenario === 'bad-gateway-no-body') {
    const status = scenario === 'conflict-no-body' ? 409 : 502;
    return [
      http.post(AUDIO_UPLOAD_URL, async ({ request }) => {
        const validation = await validateAudioUploadRequest(request);
        if (!validation.ok) return invalidAudioResponse();
        return new HttpResponse(null, { status });
      }),
    ];
  }

  if (scenario === 'success') {
    return [
      http.post(AUDIO_UPLOAD_URL, async ({ request, params }) => {
        const validation = await validateAudioUploadRequest(request);
        if (!validation.ok) return invalidAudioResponse();
        return HttpResponse.json(
          interviewAnswerAudioSuccessResponse(
            String(params.interviewSessionId),
            validation.questionCode,
            validation.sequence,
          ),
        );
      }),
    ];
  }

  if (
    scenario === 'unauthorized-then-success' ||
    scenario === 'unauthorized-retry-unauthorized' ||
    scenario === 'unauthorized-reissue-failed' ||
    scenario === 'unauthorized-reissue-delayed'
  ) {
    return [
      http.post(AUDIO_UPLOAD_URL, async ({ request, params }) => {
        const validation = await validateAudioUploadRequest(request);
        if (!validation.ok) return invalidAudioResponse();

        if (!isRetryAfterReissue(request) || scenario === 'unauthorized-retry-unauthorized') {
          return unauthorizedResponse();
        }

        return HttpResponse.json(
          interviewAnswerAudioSuccessResponse(
            String(params.interviewSessionId),
            validation.questionCode,
            validation.sequence,
          ),
        );
      }),
      http.post(REISSUE_URL, async () => {
        if (scenario === 'unauthorized-reissue-failed') {
          return unauthorizedResponse();
        }
        if (scenario === 'unauthorized-reissue-delayed') {
          await delay(DELAYED_REISSUE_MS);
        }
        return HttpResponse.json({
          status: 'OK',
          code: 200,
          data: { accessToken: REISSUED_ACCESS_TOKEN },
          message: 'OK',
        });
      }),
    ];
  }

  const { httpStatus, body } = INTERVIEW_AUDIO_ERROR_RESPONSES[scenario];
  return [
    http.post(AUDIO_UPLOAD_URL, async ({ request }) => {
      const validation = await validateAudioUploadRequest(request);
      if (!validation.ok) return invalidAudioResponse();
      return body === null
        ? new HttpResponse(null, { status: httpStatus })
        : HttpResponse.json(body, { status: httpStatus });
    }),
  ];
}

/** #119 답변 녹음 업로드 기본 핸들러 — 200 성공 시나리오 */
export const interviewAudioUploadHandlers = createInterviewAudioUploadHandlers('success');
