import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearAccessToken, setAccessToken } from '../auth-token';
import { completeKakaoSignup, exchangeKakaoOAuth, startKakaoOAuth } from '../kakao-auth-api';

const API = 'https://api.weiverai.com/api/auth';
const server = setupServer(
  http.get(`${API}/csrf`, () => HttpResponse.json({ data: { csrfToken: 'csrf-test' } })),
);
const terms = {
  serviceTerms: true,
  privacyPolicy: true,
  individualTerms: true,
  aiAnalysisConsent: true,
  sensitiveDataConsent: true,
  marketingConsent: false,
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  clearAccessToken();
});
afterAll(() => server.close());

describe('카카오 공개 API 계약', () => {
  it.each([
    ['start', () => startKakaoOAuth()],
    ['exchange', () => exchangeKakaoOAuth('flow-id')],
    ['signup/complete', () => completeKakaoSignup('signup-token', terms)],
  ] as const)(
    '%s에 쿠키와 CSRF를 보내며 401이어도 토큰 재발급·재전송하지 않는다',
    async (path, request) => {
      let calls = 0;
      setAccessToken('stale-token');
      server.use(
        http.post(`${API}/applicants/kakao/${path}`, ({ request: captured }) => {
          calls += 1;
          expect(captured.credentials).toBe('include');
          expect(captured.headers.get('X-XSRF-TOKEN')).toBe('csrf-test');
          expect(captured.headers.has('Authorization')).toBe(false);
          return HttpResponse.json(
            { errorCode: 'UNAUTHORIZED', message: 'unauthorized' },
            { status: 401 },
          );
        }),
      );
      await expect(request()).rejects.toMatchObject({ status: 401, apiStatus: 'UNAUTHORIZED' });
      expect(calls).toBe(1);
    },
  );

  it('data.status를 반환하고 exchange 본문에는 flowId만 보낸다', async () => {
    server.use(
      http.post(`${API}/applicants/kakao/exchange`, async ({ request }) => {
        expect(await request.json()).toEqual({ flowId: 'flow-id' });
        return HttpResponse.json({
          status: 'success',
          data: { status: 'SIGNUP_REQUIRED', signupToken: 'signup-token' },
        });
      }),
    );
    await expect(exchangeKakaoOAuth('flow-id')).resolves.toEqual({
      status: 'SIGNUP_REQUIRED',
      signupToken: 'signup-token',
    });
  });

  it.each([undefined, { email: 'user@example.com', verificationToken: 'email-token' }])(
    '동의 필드를 매핑하고 마케팅 거부 및 필요한 이메일 인증 정보를 전송한다 (%s)',
    async (emailVerification) => {
      server.use(
        http.post(`${API}/applicants/kakao/signup/complete`, async ({ request }) => {
          expect(await request.json()).toEqual({
            signupToken: 'signup-token',
            agreements: {
              termsOfService: true,
              privacyPolicy: true,
              individualMemberTerms: true,
              aiAnalysisConsent: true,
              sensitiveDataConsent: true,
              marketingConsent: false,
            },
            ...emailVerification,
          });
          return HttpResponse.json(
            { data: { accessToken: 'access', role: 'APPLICANT' } },
            { status: 201 },
          );
        }),
      );
      await expect(completeKakaoSignup('signup-token', terms, emailVerification)).resolves.toEqual({
        accessToken: 'access',
        role: 'APPLICANT',
      });
    },
  );
});
