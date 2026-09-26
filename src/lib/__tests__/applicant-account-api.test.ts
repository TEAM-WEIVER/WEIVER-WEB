import { beforeEach, describe, expect, it, vi } from 'vitest';

import { changeMyPassword, withdrawApplicant } from '../applicant-account-api';
import { apiRequest } from '../api-client';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('changeMyPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('현재 비밀번호와 새 비밀번호를 계정 비밀번호 변경 API로 전송한다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: null,
      message: 'OK',
    });

    await expect(
      changeMyPassword({
        currentPassword: 'Current1!',
        newPassword: 'NewPassword1!',
        newPasswordConfirm: 'NewPassword1!',
      }),
    ).resolves.toMatchObject({ status: 'OK' });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: 'Current1!',
        newPassword: 'NewPassword1!',
        newPasswordConfirm: 'NewPassword1!',
      },
    });
  });

  it('현재 로그인한 구직자의 탈퇴 API를 호출한다', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: null,
      message: 'OK',
    });

    await expect(withdrawApplicant()).resolves.toMatchObject({ status: 'OK' });

    expect(apiRequest).toHaveBeenCalledWith('/api/auth/applicants/me', {
      method: 'DELETE',
    });
  });
});
