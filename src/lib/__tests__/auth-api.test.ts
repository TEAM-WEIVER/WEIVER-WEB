import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, getAccessToken } from '../auth-token';
import { apiRequest } from '../api-client';
import { reissueAccessToken } from '../auth-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('auth-api', () => {
  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it('refreshToken 쿠키 기반 accessToken 재발급 요청을 보내고 새 토큰을 저장한다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        accessToken: 'new-access-token',
      },
      message: 'OK',
    });

    await expect(reissueAccessToken()).resolves.toEqual({
      status: 'OK',
      code: 200,
      data: {
        accessToken: 'new-access-token',
      },
      message: 'OK',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/reissue', {
      method: 'POST',
      skipAuthorization: true,
      skipAuthRetry: true,
    });
    expect(getAccessToken()).toBe('new-access-token');
  });
});
