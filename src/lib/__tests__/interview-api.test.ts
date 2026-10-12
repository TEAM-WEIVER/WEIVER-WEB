// @vitest-environment node
// MSW 업로드 핸들러는 request.formData()를 쓰므로 jsdom이 아닌 node 환경에서 실행한다.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createInterviewAudioUploadHandlers } from '@/mocks/handlers/interview';

import { ApiError } from '../api-client';
import { clearAccessToken } from '../auth-token';
import {
  getInterviewRemaining,
  reportInterviewError,
  requestInterviewAnalysis,
  submitInterviewAnswerAudio,
} from '../interview-api';

const csrfHandler = http.get('https://api.piuda.site/api/auth/csrf', () =>
  HttpResponse.json({ status: 'OK', code: 200, data: { csrfToken: 'csrf-token' }, message: 'OK' }),
);

const server = setupServer(csrfHandler);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // 재발급 성공 시 메모리 토큰이 남아 다음 테스트의 첫 요청이 재시도로 판별되지 않게 한다.
  clearAccessToken();
});
afterAll(() => server.close());

function makeFile(type = 'audio/webm') {
  return new File([new Uint8Array(32)], 'answer.webm', { type });
}

function submit(file = makeFile()) {
  return submitInterviewAnswerAudio('session-1', {
    questionCode: 'S_01_00',
    sequence: 1,
    file,
  });
}

describe('submitInterviewAnswerAudio (#119)', () => {
  it('question_code·sequence를 쿼리로, file만 multipart로 보내 200 응답을 받는다', async () => {
    let captured: { url: URL; keys: string[]; contentType: string | null } | null = null;
    server.use(
      http.post('https://api.piuda.site/api/interviews/:id/answers/audio', async ({ request }) => {
        captured = {
          url: new URL(request.url),
          keys: Array.from((await request.clone().formData()).keys()),
          contentType: request.headers.get('content-type'),
        };
        return undefined;
      }),
      ...createInterviewAudioUploadHandlers('success'),
    );

    const response = await submit();

    expect(response.data).toEqual({
      interview_session_id: 'session-1',
      status: 'WAITING_FOR_QUESTION',
      question_code: 'S_01_00',
      sequence: 1,
    });
    expect(captured).not.toBeNull();
    const { url, keys, contentType } = captured!;
    expect(url.pathname).toBe('/api/interviews/session-1/answers/audio');
    expect(url.searchParams.get('question_code')).toBe('S_01_00');
    expect(url.searchParams.get('sequence')).toBe('1');
    expect(keys).toEqual(['file']);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('오류 응답 envelope의 status 문자열을 ApiError.apiStatus로 받는다', async () => {
    server.use(...createInterviewAudioUploadHandlers('already-completed'));

    const error = await submit().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).apiStatus).toBe('INTERVIEW_ALREADY_COMPLETED');
  });

  it('본문 없는 502는 apiStatus 없이 HTTP 상태만 가진다', async () => {
    server.use(...createInterviewAudioUploadHandlers('bad-gateway-no-body'));

    const error = await submit().catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).apiStatus).toBeUndefined();
  });

  it('401이면 토큰 재발급 후 같은 FormData로 재시도해 성공한다', async () => {
    server.use(...createInterviewAudioUploadHandlers('unauthorized-then-success'));

    const response = await submit();

    expect(response.data.sequence).toBe(1);
  });

  it('토큰 재발급이 실패하면 isReissueFailure ApiError를 던진다', async () => {
    server.use(...createInterviewAudioUploadHandlers('unauthorized-reissue-failed'));

    const error = await submit().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isReissueFailure).toBe(true);
  });

  it('재시도 응답도 401이면 status 401 ApiError를 던진다', async () => {
    server.use(...createInterviewAudioUploadHandlers('unauthorized-retry-unauthorized'));

    const error = await submit().catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).isReissueFailure).toBe(false);
  });

  it('signal이 abort되면 요청이 reject된다', async () => {
    server.use(...createInterviewAudioUploadHandlers('success'));
    const controller = new AbortController();
    controller.abort();

    await expect(
      submitInterviewAnswerAudio('session-1', {
        questionCode: 'S_01_00',
        sequence: 1,
        file: makeFile(),
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });
});

const API = 'https://api.piuda.site';

describe('getInterviewRemaining', () => {
  it('GET /api/interviews/remaining 응답 envelope을 반환한다', async () => {
    let method: string | undefined;
    server.use(
      http.get(`${API}/api/interviews/remaining`, ({ request }) => {
        method = request.method;
        return HttpResponse.json({
          status: 'OK',
          code: 200,
          data: {
            totalCount: 3,
            remainingCount: 2,
            reapplyDDay: 0,
            reapplyAvailableDate: '2026-10-12',
            pendingSubmissionSessionId: null,
          },
          message: 'OK',
        });
      }),
    );

    const response = await getInterviewRemaining();

    expect(method).toBe('GET');
    expect(response.data.remainingCount).toBe(2);
  });
});

describe('requestInterviewAnalysis', () => {
  it('POST /api/interviews/{id}/analysis로 분석을 요청한다(세션 ID는 인코딩)', async () => {
    let url: string | undefined;
    server.use(
      http.post(`${API}/api/interviews/:id/analysis`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({
          status: 'OK',
          code: 200,
          data: {
            interview_session_id: 'a/b',
            status: 'TRANSCRIPT_SAVE_REQUESTED',
            next_available_interview_at: '2026-10-19',
          },
          message: 'OK',
        });
      }),
    );

    const response = await requestInterviewAnalysis('a/b');

    expect(url).toBe(`${API}/api/interviews/a%2Fb/analysis`);
    expect(response.data.status).toBe('TRANSCRIPT_SAVE_REQUESTED');
  });

  it('401이면 토큰 재발급·재시도 없이 바로 실패한다(skipAuthRetry)', async () => {
    let analysisCalls = 0;
    let reissueCalls = 0;
    server.use(
      http.post(`${API}/api/interviews/:id/analysis`, () => {
        analysisCalls += 1;
        return HttpResponse.json(
          { status: 'UNAUTHORIZED', code: 401, data: null, message: 'unauthorized' },
          { status: 401 },
        );
      }),
      http.post(`${API}/api/auth/*`, () => {
        reissueCalls += 1;
        return HttpResponse.json({ status: 'OK', code: 200, data: {}, message: 'OK' });
      }),
    );

    const error = await requestInterviewAnalysis('session-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(analysisCalls).toBe(1);
    expect(reissueCalls).toBe(0);
  });
});

describe('reportInterviewError', () => {
  it('POST /api/interviews/{id}/error-report로 content를 JSON 본문에 보낸다', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/api/interviews/:id/error-report`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ status: 'OK', code: 200, data: 'ok', message: 'OK' });
      }),
    );

    const response = await reportInterviewError('session-1', '소리가 안 들려요');

    expect(body).toEqual({ content: '소리가 안 들려요' });
    expect(response.data).toBe('ok');
  });
});
