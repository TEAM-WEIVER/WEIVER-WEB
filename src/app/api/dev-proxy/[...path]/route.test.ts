import { afterEach, describe, expect, it, vi } from 'vitest';

import { NextRequest } from 'next/server';

import { GET, POST, rewriteSetCookieForLocal } from './route';

const ORIGINAL_ENV = process.env;

function enableDevProxy() {
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_BASE_URL: '/api/dev-proxy',
    API_PROXY_TARGET: 'https://api.piuda.site',
  };
}

function createContext(path: string[]) {
  return {
    params: Promise.resolve({ path }),
  };
}

describe('dev proxy route', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.unstubAllGlobals();
  });

  it('운영 환경에서는 요청을 차단한다', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_BASE_URL: '/api/dev-proxy',
    };

    const response = await GET(
      new NextRequest('http://localhost:3000/api/dev-proxy/api/auth/csrf'),
      createContext(['api', 'auth', 'csrf']),
    );

    expect(response.status).toBe(404);
  });

  it('백엔드로 요청을 포워딩하고 로컬용 Set-Cookie로 변환한다', async () => {
    enableDevProxy();

    const upstreamHeaders = new Headers({
      'Content-Type': 'application/json',
    });
    upstreamHeaders.append(
      'Set-Cookie',
      'XSRF-TOKEN=csrf-token; Path=/; Domain=.piuda.site; Secure; SameSite=None',
    );
    upstreamHeaders.append(
      'Set-Cookie',
      'refreshToken=refresh-token; Path=/; Domain=.piuda.site; HttpOnly; Secure; SameSite=None',
    );

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: upstreamHeaders,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      new NextRequest('http://localhost:3000/api/dev-proxy/api/example?tab=profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'XSRF-TOKEN=csrf-token',
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
          Referer: 'http://localhost:3000/signup/account-info',
        },
        body: JSON.stringify({ name: 'piuda' }),
      }),
      createContext(['api', 'example']),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://api.piuda.site/api/example?tab=profile'),
      expect.objectContaining({
        method: 'POST',
        redirect: 'manual',
      }),
    );

    const [, requestOptions] = fetchMock.mock.calls[0];
    expect((requestOptions.headers as Headers).get('host')).toBeNull();
    expect((requestOptions.headers as Headers).get('origin')).toBeNull();
    expect((requestOptions.headers as Headers).get('referer')).toBeNull();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('XSRF-TOKEN=csrf-token; Path=/; SameSite=Lax');
    expect(setCookie).toContain('refreshToken=refresh-token; Path=/; HttpOnly; SameSite=Lax');
  });

  it('쿠키 속성 변환 시 HttpOnly는 유지한다', () => {
    expect(
      rewriteSetCookieForLocal(
        'refreshToken=abc; Path=/; Domain=.piuda.site; HttpOnly; Secure; SameSite=None',
      ),
    ).toBe('refreshToken=abc; Path=/; HttpOnly; SameSite=Lax');
  });
});
