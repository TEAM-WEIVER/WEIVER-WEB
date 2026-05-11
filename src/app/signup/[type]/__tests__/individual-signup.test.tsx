import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignupStore } from '@/store/signup-store';

import AccountPage from '../account/page';

const navigationMock = vi.hoisted(() => ({
  params: { type: 'individual' },
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => navigationMock.params,
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

describe('개인 회원가입 플로우', () => {
  beforeEach(() => {
    navigationMock.params = { type: 'individual' };
    navigationMock.push.mockClear();
    useSignupStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
  });

  it('이메일 형식이 유효하지 않으면 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'invalid-email');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aa',
    );

    await waitFor(() =>
      expect(screen.getByText('올바른 이메일 형식을 입력해주세요.')).toBeInTheDocument(),
    );
    expect(nextButton).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('비밀번호 규칙을 만족하지 않으면 인증 후에도 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1aaa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1aaa',
    );
    await user.click(screen.getByRole('button', { name: '인증하기' }));
    await user.type(screen.getByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '확인' }));

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(screen.getByText('이메일이 인증되었습니다.')).toBeInTheDocument());
    expect(nextButton).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('비밀번호 확인이 일치하지 않으면 오류를 표시하고 계정 단계 제출을 막는다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!ab',
    );

    await waitFor(() =>
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /다음 단계/ })).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('이메일 인증 전에는 계정 단계에서 다음 단계로 이동할 수 없다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    expect(screen.getByText('1단계 : 계정 정보를 입력해주세요.')).toBeInTheDocument();
    expect(screen.queryByText('회사명을 입력해주세요.')).not.toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aa',
    );

    await waitFor(() => expect(nextButton).toBeDisabled());
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('이메일 인증과 유효한 계정 입력 후 약관 단계로 이동한다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    await user.type(screen.getByPlaceholderText('personal@gmail.com'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aa',
    );
    await user.click(screen.getByRole('button', { name: '인증하기' }));
    await user.type(screen.getByPlaceholderText('숫자 6자리'), '123456');
    await user.click(screen.getByRole('button', { name: '확인' }));

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(nextButton).toBeEnabled());

    await user.click(nextButton);

    expect(navigationMock.push).toHaveBeenCalledWith('/signup/individual/terms');
    expect(useSignupStore.getState().account).toEqual({
      email: 'user@example.com',
      companyName: undefined,
    });
  });
});
