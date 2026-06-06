import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, getAccessToken, getAuthRole, setAuthSession } from '../auth-token';
import { apiRequest } from '../api-client';
import { logout, reissueAccessToken } from '../auth-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('auth-api', () => {
  afterEach(() => {
    clearAccessToken();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('refreshToken 쿠키 기반 accessToken 재발급 요청을 보내고 새 토큰을 저장한다', async () => {
    setAuthSession('expired-access-token', 'APPLICANT');
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
    expect(getAuthRole()).toBe('APPLICANT');
  });

  it('로그아웃 요청 후 로컬 인증 상태를 삭제한다', async () => {
    setAuthSession('access-token', 'COMPANY');
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: 'OK',
      message: 'OK',
    });

    await expect(logout()).resolves.toEqual({
      status: 'OK',
      code: 200,
      data: 'OK',
      message: 'OK',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
    });
    expect(getAccessToken()).toBeNull();
    expect(getAuthRole()).toBeNull();
  });

  it('로그아웃 요청이 실패해도 로컬 인증 상태를 삭제한다', async () => {
    setAuthSession('access-token', 'COMPANY');
    vi.mocked(apiRequest).mockRejectedValue(new Error('logout failed'));

    await expect(logout()).rejects.toThrow('logout failed');

    expect(getAccessToken()).toBeNull();
    expect(getAuthRole()).toBeNull();
  });
});
