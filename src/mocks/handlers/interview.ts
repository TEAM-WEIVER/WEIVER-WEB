/**
 * AI 면접 WebSocket(STOMP) 목 핸들러 (#44, #118)
 *
 * WebSocket/STOMP 프로토콜은 MSW HTTP 핸들러로 직접 목킹할 수 없으므로,
 * 이 파일은 면접 세션에 필요한 보조 REST API 핸들러만 제공한다.
 *
 * WebSocket STOMP 메시지 시뮬레이션은 Playwright의 page.routeWebSocket()을
 * 각 e2e 테스트 케이스 안에서 직접 구현한다.
 */

import { http, HttpResponse } from 'msw';

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
 */
export const ANSWER_ACCEPTED_PAYLOAD = (sequence: number) => ({
  type: 'ANSWER_ACCEPTED',
  interview_session_id: 'session-abc-123',
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
