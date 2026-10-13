import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.weiverai.com');
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
      'https://api.weiverai.com/api/example',
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
      'https://api.weiverai.com/api/auth/csrf',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );

    const [, requestOptions] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.weiverai.com/api/example');
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
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.weiverai.com${path}`);
    expect((requestOptions.headers as Headers).get('X-XSRF-TOKEN')).toBeNull();
    expect((requestOptions.headers as Headers).get('Authorization')).toBeNull();
  });

  it('실패 응답의 message를 ApiError에 담는다', async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          httpStatus: 409,
          errorCode: 'EMAIL_ALREADY_EXISTS',
          message: '이미 사용 중인 이메일입니다.',
          timestamp: '2026-07-23T14:37:16',
          path: '/api/auth/applicants/email/send',
          errors: [],
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest } = await import('../api-client');

    await expect(
      apiRequest('/api/auth/applicants/email/send', {
        method: 'POST',
        body: { email: 'applicant@example.com' },
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: '이미 사용 중인 이메일입니다.',
      status: 409,
      apiStatus: 'EMAIL_ALREADY_EXISTS',
    });
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
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.weiverai.com/api/auth/csrf');

      const [, requestOptions] = fetchMock.mock.calls[1];
      expect(fetchMock.mock.calls[1][0]).toBe(`https://api.weiverai.com${path}`);
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
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.weiverai.com/api/applicants/me');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.weiverai.com/api/auth/csrf');
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.weiverai.com/api/auth/reissue');
    expect(fetchMock.mock.calls[3][0]).toBe('https://api.weiverai.com/api/applicants/me');

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
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.weiverai.com/api/auth/csrf');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.weiverai.com/api/auth/reissue');
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(getAccessToken()).toBe('deduped-access-token');
  });

  it('토큰 재발급이 실패하면 isReissueFailure가 true인 ApiError를 던진다 (#119 AC12)', async () => {
    vi.resetModules();

    const csrfResponse = () =>
      new Response(
        JSON.stringify({
          status: 'OK',
          code: 200,
          data: { csrfToken: 'csrf-token' },
          message: 'OK',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const { setAccessToken } = await import('../auth-token');
    const { apiRequest, ApiError, REISSUE_FAILED_MESSAGE } = await import('../api-client');

    setAccessToken('expired-access-token');

    const error = await apiRequest('/api/example', { method: 'POST' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).isReissueFailure).toBe(true);
    expect((error as InstanceType<typeof ApiError>).message).toBe(REISSUE_FAILED_MESSAGE);
    expect((error as InstanceType<typeof ApiError>).message).toBe('Access token reissue failed');
    expect((error as InstanceType<typeof ApiError>).status).toBe(403);
  });

  it('일반 오류 응답의 ApiError는 isReissueFailure가 false이다', async () => {
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiRequest, ApiError } = await import('../api-client');

    const error = await apiRequest('/api/example').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).isReissueFailure).toBe(false);
  });

  it('FormData 본문과 signal을 첫 요청과 401 후 재시도 요청에 그대로 전달한다', async () => {
    vi.resetModules();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'OK', code: 200, data: { csrfToken: 'csrf' }, message: 'OK' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'OK', code: 200, data: { accessToken: 'new' }, message: 'OK' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
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

    const controller = new AbortController();
    const formData = new FormData();
    formData.append('file', new Blob(['a'], { type: 'audio/webm' }), 'answer.webm');

    await expect(
      apiRequest('/api/example', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: { 'X-XSRF-TOKEN': 'csrf-token' },
      }),
    ).resolves.toEqual({ ok: true });

    const [firstCall, , , retryCall] = fetchMock.mock.calls;
    expect(firstCall[1].body).toBe(formData);
    expect(firstCall[1].signal).toBe(controller.signal);
    expect((firstCall[1].headers as Headers).get('Content-Type')).toBeNull();
    expect(retryCall[1].body).toBe(formData);
    expect(retryCall[1].signal).toBe(controller.signal);
  });
});
