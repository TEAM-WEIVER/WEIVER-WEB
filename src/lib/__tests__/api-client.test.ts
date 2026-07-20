import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.piuda.site');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET 요청에는 CSRF 토큰을 요청하지 않는다', async () => {
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest } = await import('../api-client');

    await expect(apiRequest('/api/example')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.piuda.site/api/example',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('accessToken이 있으면 인증 요청에 Authorization 헤더를 담아 보낸다', async () => {
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { setAccessToken } = await import('../auth-token');
    const { apiRequest } = await import('../api-client');

    setAccessToken('access-token');

    await expect(apiRequest('/api/applicants/me')).resolves.toEqual({ ok: true });

    const [, requestOptions] = fetchMock.mock.calls[0];
    expect((requestOptions.headers as Headers).get('Authorization')).toBe('Bearer access-token');
    expect((requestOptions.headers as Headers).get('X-XSRF-TOKEN')).toBeNull();
  });

  it('GET이 아닌 요청에는 CSRF 토큰을 헤더에 담아 보낸다', async () => {
    vi.resetModules();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            code: 200,
            data: { csrfToken: 'csrf-token' },
            message: 'OK',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest } = await import('../api-client');

    await expect(
      apiRequest('/api/example', {
        method: 'POST',
        body: { name: 'piuda' },
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.piuda.site/api/auth/csrf',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );

    const [, requestOptions] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.piuda.site/api/example');
    expect(requestOptions).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ name: 'piuda' }),
      }),
    );
    expect((requestOptions.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
  });

  it.each([
    '/api/auth/applicants/signup/init',
    '/api/auth/applicants/signup/agreements',
    '/api/auth/applicants/login',
    '/api/auth/applicants/email/verify',
    '/api/auth/applicants/email/send',
    '/api/auth/companies/login',
  ])('공개 auth 요청에는 CSRF 토큰을 요청하지 않는다: %s', async (path) => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest } = await import('../api-client');
    const { setAccessToken } = await import('../auth-token');

    setAccessToken('stale-access-token');

    await expect(
      apiRequest(path, {
        method: 'POST',
        body: { email: 'applicant@example.com' },
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, requestOptions] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.piuda.site${path}`);
    expect((requestOptions.headers as Headers).get('X-XSRF-TOKEN')).toBeNull();
    expect((requestOptions.headers as Headers).get('Authorization')).toBeNull();
  });

  it.each(['/api/auth/reissue', '/api/auth/logout', '/api/auth/applicants/me'])(
    '인증 상태를 변경하는 auth 요청에는 CSRF 토큰을 헤더에 담아 보낸다: %s',
    async (path) => {
      vi.resetModules();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              status: 'OK',
              code: 200,
              data: { csrfToken: 'csrf-token' },
              message: 'OK',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      vi.stubGlobal('fetch', fetchMock);

      const { apiRequest } = await import('../api-client');

      await expect(
        apiRequest(path, {
          method: path.endsWith('/me') ? 'DELETE' : 'POST',
        }),
      ).resolves.toEqual({ ok: true });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.piuda.site/api/auth/csrf');

      const [, requestOptions] = fetchMock.mock.calls[1];
      expect(fetchMock.mock.calls[1][0]).toBe(`https://api.piuda.site${path}`);
      expect((requestOptions.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    },
  );

  it('인증 요청이 401이면 accessToken을 재발급하고 원 요청을 한 번 재시도한다', async () => {
    vi.resetModules();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            code: 200,
            data: { csrfToken: 'csrf-token' },
            message: 'OK',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            code: 200,
            data: { accessToken: 'new-access-token' },
            message: 'OK',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getAccessToken, setAccessToken } = await import('../auth-token');
    const { apiRequest } = await import('../api-client');

    setAccessToken('expired-access-token');

    await expect(apiRequest('/api/applicants/me')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.piuda.site/api/applicants/me');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.piuda.site/api/auth/csrf');
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.piuda.site/api/auth/reissue');
    expect(fetchMock.mock.calls[3][0]).toBe('https://api.piuda.site/api/applicants/me');

    expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe(
      'Bearer expired-access-token',
    );
    expect(fetchMock.mock.calls[2][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect((fetchMock.mock.calls[2][1].headers as Headers).get('Authorization')).toBeNull();
    expect((fetchMock.mock.calls[2][1].headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect((fetchMock.mock.calls[3][1].headers as Headers).get('Authorization')).toBe(
      'Bearer new-access-token',
    );
    expect(getAccessToken()).toBe('new-access-token');
  });

  it('동시에 발생한 accessToken 재발급 요청을 하나의 네트워크 요청으로 합친다', async () => {
    vi.resetModules();

    const reissueResponse = {
      status: 'OK',
      code: 200,
      data: { accessToken: 'deduped-access-token' },
      message: 'OK',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'OK',
            code: 200,
            data: { csrfToken: 'csrf-token' },
            message: 'OK',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(reissueResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getAccessToken } = await import('../auth-token');
    const { reissueAccessTokenWithRefreshCookie } = await import('../api-client');

    await expect(
      Promise.all([reissueAccessTokenWithRefreshCookie(), reissueAccessTokenWithRefreshCookie()]),
    ).resolves.toEqual([reissueResponse, reissueResponse]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.piuda.site/api/auth/csrf');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.piuda.site/api/auth/reissue');
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(getAccessToken()).toBe('deduped-access-token');
  });
});
