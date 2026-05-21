import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loginApplicant, loginCompany } from '@/lib/login-api';

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
  loginCompany: vi.fn(),
}));

describe('로그인 페이지', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.mocked(loginCompany).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        accessToken: 'access-token',
        role: 'COMPANY',
      },
      message: 'OK',
    });
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
    vi.clearAllMocks();
  });

  it('기업 로그인 성공 시 기업 대시보드로 이동한다', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('weiver'), 'weiver');
    await user.type(screen.getByPlaceholderText('올바른 비밀번호를 입력하세요'), 'Password123!');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    await waitFor(() => {
      expect(loginCompany).toHaveBeenCalledWith({
        id: 'weiver',
        password: 'Password123!',
      });
    });
    expect(navigationMock.push).toHaveBeenCalledWith('/corporate/dashboard');
  });

  it('기업 로그인 실패 시 오류를 표시하고 이동하지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(loginCompany).mockRejectedValue(new Error('login failed'));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('weiver'), 'weiver');
    await user.type(screen.getByPlaceholderText('올바른 비밀번호를 입력하세요'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(
      await screen.findByText('로그인에 실패했습니다. 아이디와 비밀번호를 다시 확인해주세요.'),
    ).toBeInTheDocument();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('개인 로그인 성공 시 이력서 온보딩으로 이동한다', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: '개인 회원' }));
    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('올바른 비밀번호를 입력하세요'), 'Password123!');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    await waitFor(() => {
      expect(loginApplicant).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
      });
    });
    expect(loginCompany).not.toHaveBeenCalled();
    expect(navigationMock.push).toHaveBeenCalledWith('/onboarding/resume');
  });

  it('개인 로그인 실패 시 이메일 기준 오류를 표시하고 이동하지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(loginApplicant).mockRejectedValue(new Error('login failed'));

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: '개인 회원' }));
    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('올바른 비밀번호를 입력하세요'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(
      await screen.findByText('로그인에 실패했습니다. 이메일과 비밀번호를 다시 확인해주세요.'),
    ).toBeInTheDocument();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
