import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import { loginApplicant, loginCompany } from '../login-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('login-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        accessToken: 'access-token',
        role: 'COMPANY',
      },
      message: 'OK',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('기업 로그인 요청을 서버 스펙에 맞게 보낸다', async () => {
    await loginCompany({
      id: 'weiver',
      password: 'Password123!',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/companies/login', {
      method: 'POST',
      body: {
        id: 'weiver',
        password: 'Password123!',
      },
    });
  });

  it('개인 로그인 요청을 서버 스펙에 맞게 보낸다', async () => {
    await loginApplicant({
      email: 'applicant@example.com',
      password: 'Password123!',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/login', {
      method: 'POST',
      body: {
        email: 'applicant@example.com',
        password: 'Password123!',
      },
    });
  });
});
