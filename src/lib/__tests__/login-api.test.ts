import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import { loginCompany } from '../login-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('login-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {},
      message: 'OK',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('기업 로그인 요청을 서버 스펙에 맞게 보낸다', async () => {
    await loginCompany({
      email: 'hr@company.co.kr',
      password: 'Password123!',
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/companies/login', {
      method: 'POST',
      body: {
        email: 'hr@company.co.kr',
        password: 'Password123!',
      },
    });
  });
});
