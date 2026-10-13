// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { POST } from './route';

const { setCookie } = vi.hoisted(() => ({ setCookie: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: setCookie }) }));

const server = setupServer();
const endpoint = `${process.env.API_BACKEND_URL ?? 'https://api.weiverai.com'}/api/auth/applicants/signup/agreements`;

function request() {
  return new NextRequest('https://weiverai.com/api/auth/signup/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreements: [{ code: 'SERVICE', agreed: true }] }),
  });
}

describe('#136 회원가입 완료 서버 route 회귀', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });
  afterAll(() => server.close());

  it('본품 백엔드로 JSON을 전달하고 운영 HttpOnly cookie와 기존 응답을 유지한다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    let receivedBody: unknown;
    server.use(
      http.post(endpoint, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ data: { accessToken: 'test-access-token', role: 'APPLICANT' } });
      }),
    );
    const response = await POST(request());
    expect(receivedBody).toEqual({ agreements: [{ code: 'SERVICE', agreed: true }] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { accessToken: 'test-access-token', role: 'APPLICANT' },
    });
    expect(setCookie).toHaveBeenCalledWith('weiver.access_token', 'test-access-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });
  });

  for (const status of [400, 500]) {
    it(`${status} 백엔드 오류를 전달하고 인증 cookie를 설정하지 않는다`, async () => {
      const body = { message: 'Signup failed', data: null };
      server.use(http.post(endpoint, () => HttpResponse.json(body, { status })));
      const response = await POST(request());
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(body);
      expect(setCookie).not.toHaveBeenCalled();
    });
  }
});
