import { MemoryRouter } from 'react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-client';
import { clearAccessToken, getAccessToken, getAuthRole } from '@/lib/auth-token';
import { loginApplicant } from '@/lib/login-api';

import LoginPage from '../page';

const navigationMock = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigationMock.navigate,
}));

vi.mock('@/lib/login-api', () => ({
  loginApplicant: vi.fn(),
}));

async function fillLoginForm(password: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

  const emailInput = screen.getByLabelText('이메일', { exact: true });
  const passwordInput = screen.getByLabelText('비밀번호', { exact: true });
  const submitButton = screen.getByRole('button', { name: '로그인' });

  await user.type(emailInput, 'user@example.com');
  await user.type(passwordInput, password);

  return { user, emailInput, passwordInput, submitButton };
}

describe('로그인 페이지', () => {
  beforeEach(() => {
    navigationMock.navigate.mockClear();
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
    const { user, passwordInput } = await fillLoginForm('Password123!');
    await user.type(passwordInput, '{Enter}');

    await waitFor(() => {
      expect(loginApplicant).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
      });
    });
    expect(getAccessToken()).toBe('access-token');
    expect(getAuthRole()).toBe('APPLICANT');
    expect(navigationMock.navigate).toHaveBeenCalledWith('/home');
  });

  it('인증 거절 시 두 필드에 오류를 알리고 다시 제출할 수 있다', async () => {
    vi.mocked(loginApplicant).mockRejectedValueOnce(
      new ApiError('Invalid password', 401, 'INVALID_PASSWORD'),
    );
    const { user, emailInput, passwordInput, submitButton } = await fillLoginForm('wrong-password');
    await user.click(submitButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('이메일 또는 비밀번호가 일치하지 않습니다.');
    expect(emailInput).toBeInvalid();
    expect(passwordInput).toBeInvalid();
    expect(emailInput).toHaveAccessibleDescription(alert.textContent);
    expect(passwordInput).toHaveAccessibleDescription(alert.textContent);
    expect(navigationMock.navigate).not.toHaveBeenCalled();

    await user.clear(passwordInput);
    await user.type(passwordInput, 'Password123!');
    await user.click(submitButton);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(navigationMock.navigate).toHaveBeenCalledWith('/home');
  });

  it.each([new TypeError('Network error'), new ApiError('Server error', 503)])(
    '요청 실패 시 입력 오류 표시 없이 재시도를 안내한다 (%s)',
    async (error) => {
      vi.mocked(loginApplicant).mockRejectedValueOnce(error);
      const { user, emailInput, passwordInput, submitButton } = await fillLoginForm('Password123!');
      await user.click(submitButton);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
      expect(emailInput).toBeValid();
      expect(passwordInput).toBeValid();
      expect(navigationMock.navigate).not.toHaveBeenCalled();
    },
  );

  it('로그인 응답을 기다리는 동안 중복 제출을 막는다', async () => {
    vi.mocked(loginApplicant).mockImplementationOnce(() => new Promise(() => {}));
    const { user, submitButton } = await fillLoginForm('Password123!');
    const form = submitButton.closest('form')!;

    await user.click(submitButton);
    fireEvent.submit(form);

    expect(loginApplicant).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAccessibleName('로그인 중...');
  });
});
