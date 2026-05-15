import { describe, expect, it, vi } from 'vitest';

describe('apiRequest', () => {
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
});
