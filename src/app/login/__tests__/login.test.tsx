import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, getAccessToken, getAuthRole } from '@/lib/auth-token';
import { loginApplicant } from '@/lib/login-api';

import LoginPage from '../page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/login-api', () => ({
  loginApplicant: vi.fn(),
}));

describe('로그인 페이지', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    clearAccessToken();
    vi.mocked(loginApplicant).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        accessToken: 'access-token',
        role: 'APPLICANT',
      },
      message: 'OK',
    });
  });

  afterEach(() => {
    cleanup();
    clearAccessToken();
    vi.clearAllMocks();
  });

  it('개인 로그인 성공 시 회원 홈으로 이동한다', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일', { exact: true }), 'user@example.com');
    await user.type(screen.getByLabelText('비밀번호', { exact: true }), 'Password123!');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    await waitFor(() => {
      expect(loginApplicant).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
      });
    });
    expect(getAccessToken()).toBe('access-token');
    expect(getAuthRole()).toBe('APPLICANT');
    expect(navigationMock.push).toHaveBeenCalledWith('/home');
  });

  it('개인 로그인 실패 시 이메일 기준 오류를 표시하고 이동하지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(loginApplicant).mockRejectedValue(new Error('login failed'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText('이메일', { exact: true }), 'user@example.com');
    await user.type(screen.getByLabelText('비밀번호', { exact: true }), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(
      await screen.findByText('로그인에 실패했습니다. 이메일과 비밀번호를 다시 확인해주세요.'),
    ).toBeInTheDocument();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
