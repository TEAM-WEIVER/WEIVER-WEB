import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-client';
import {
  initApplicantSignup,
  sendApplicantVerificationEmail,
  verifyApplicantEmail,
} from '@/lib/signup-api';
import { useSignupStore } from '@/store/signup-store';

import SignupAccountInfoPage from '../account-info/page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/signup-api', () => ({
  initApplicantSignup: vi.fn(),
  sendApplicantVerificationEmail: vi.fn(),
  verifyApplicantEmail: vi.fn(),
}));

describe('개인 회원가입 플로우', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.mocked(initApplicantSignup).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        signupToken: 'signup-token',
      },
      message: 'OK',
    });
    vi.mocked(sendApplicantVerificationEmail).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: 'sent',
      message: 'OK',
    });
    vi.mocked(verifyApplicantEmail).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: {
        verificationToken: 'verification-token',
      },
      message: 'OK',
    });
    useSignupStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('이메일 형식이 유효하지 않으면 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'invalid-email');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaaa',
    );

    await waitFor(() =>
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument(),
    );
    expect(nextButton).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('비밀번호 규칙을 만족하지 않으면 인증 후에도 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1aaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1aaa',
    );
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));
    await user.type(await screen.findByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '인증번호 확인' }));

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(screen.getByText('인증 완료')).toBeInTheDocument());
    expect(nextButton).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('비밀번호 규칙을 모두 만족하면 기존 비밀번호 오류 메시지를 숨긴다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    const passwordInput = screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자');

    await user.type(passwordInput, 'Aa1aaaa');
    await waitFor(() => expect(screen.getByText('8자 이상이어야 합니다.')).toBeInTheDocument());

    await user.type(passwordInput, '!');

    await waitFor(() =>
      expect(screen.queryByText('8자 이상이어야 합니다.')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('특수문자가 포함되어야 합니다.')).not.toBeInTheDocument();
  });

  it('비밀번호 확인이 일치하지 않으면 오류를 표시하고 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaab',
    );

    await waitFor(() =>
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /다음 단계/ })).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('이메일 인증 전에는 계정 단계에서 다음 단계로 이동할 수 없다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    expect(screen.getByText('1단계 : 계정 정보를 입력해주세요.')).toBeInTheDocument();
    expect(screen.queryByText('회사명을 입력해주세요.')).not.toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaaa',
    );

    await waitFor(() => expect(nextButton).toBeDisabled());
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('이메일 인증과 유효한 계정 입력 후 약관 단계로 이동한다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaaa',
    );
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));
    expect(sendApplicantVerificationEmail).toHaveBeenCalledWith('user@example.com');
    await user.type(await screen.findByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '인증번호 확인' }));

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(nextButton).toBeEnabled());

    await user.click(nextButton);

    expect(verifyApplicantEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
    });
    expect(initApplicantSignup).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Aa1!aaaa',
      passwordConfirm: 'Aa1!aaaa',
      verificationToken: 'verification-token',
    });
    expect(navigationMock.push).toHaveBeenCalledWith('/signup/agreements');
    expect(useSignupStore.getState().account).toEqual({
      email: 'user@example.com',
      signupToken: 'signup-token',
    });
  });

  it('회원가입 1단계 요청이 실패하면 약관 단계로 이동하지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(initApplicantSignup).mockRejectedValue(new Error('init failed'));

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaaa',
    );
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));
    await user.type(await screen.findByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '인증번호 확인' }));

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    expect(
      await screen.findByText('회원가입 계정 등록에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('인증번호 전송 요청이 실패하면 인증 코드 입력 UI를 열지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(sendApplicantVerificationEmail).mockRejectedValue(new Error('send failed'));

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));

    expect(
      await screen.findByText('인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('숫자 6자리')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음 단계/ })).toBeDisabled();
  });

  it('이미 등록된 이메일이면 중복 이메일 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.mocked(sendApplicantVerificationEmail).mockRejectedValue(
      new ApiError('이미 사용 중인 이메일입니다.', 409),
    );

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));

    expect(await screen.findByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('숫자 6자리')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음 단계/ })).toBeDisabled();
  });

  it('비밀번호 보기 토글 클릭 시 input type이 password에서 text로 전환된다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    const passwordInput = screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: '비밀번호 보기' });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: '비밀번호 숨기기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '비밀번호 숨기기' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('비밀번호 확인 보기 토글 클릭 시 input type이 password에서 text로 전환된다', async () => {
    const user = userEvent.setup();

    render(<SignupAccountInfoPage />);

    const passwordConfirmInput =
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.');
    expect(passwordConfirmInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: '비밀번호 확인 필드 표시' });
    await user.click(toggleButton);

    expect(passwordConfirmInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: '비밀번호 확인 필드 숨기기' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '비밀번호 확인 필드 숨기기' }));
    expect(passwordConfirmInput).toHaveAttribute('type', 'password');
  });

  it('인증번호 검증 요청이 실패하면 다음 단계로 이동할 수 없다', async () => {
    const user = userEvent.setup();
    vi.mocked(verifyApplicantEmail).mockRejectedValue(new Error('verify failed'));

    render(<SignupAccountInfoPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 8-64자'), 'Aa1!aaaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aaaa',
    );
    await user.click(screen.getByRole('button', { name: '인증번호 전송' }));
    await user.type(await screen.findByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '인증번호 확인' }));

    expect(
      await screen.findByText('인증번호가 올바르지 않습니다. 다시 확인해주세요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다음 단계/ })).toBeDisabled();
    expect(initApplicantSignup).not.toHaveBeenCalled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
