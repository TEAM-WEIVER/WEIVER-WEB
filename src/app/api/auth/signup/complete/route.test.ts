// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { POST } from './route';

const server = setupServer();
const endpoint = `${process.env.API_BACKEND_URL ?? 'https://api.weiverai.com'}/api/auth/applicants/signup/agreements`;

function request() {
  return new NextRequest('https://weiverai.com/api/auth/signup/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreements: [{ code: 'SERVICE', agreed: true }] }),
  });
}

describe('회원가입 완료 서버 경로', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('본품 백엔드로 JSON을 전달하고 성공 시 토큰이나 인증 쿠키를 발급하지 않는다', async () => {
    let receivedBody: unknown;
    server.use(
      http.post(endpoint, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ data: { accessToken: 'test-access-token', role: 'APPLICANT' } });
      }),
    );
    const response = await POST(request());
    expect(receivedBody).toEqual({ agreements: [{ code: 'SERVICE', agreed: true }] });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  for (const status of [400, 500]) {
    it(`${status} 백엔드 오류를 전달하고 인증 cookie를 설정하지 않는다`, async () => {
      const body = { message: 'Signup failed', data: null };
      server.use(http.post(endpoint, () => HttpResponse.json(body, { status })));
      const response = await POST(request());
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(body);
      expect(response.headers.get('set-cookie')).toBeNull();
    });
  }
});
