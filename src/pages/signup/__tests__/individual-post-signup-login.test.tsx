import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, getAccessToken, getAuthRole } from '@/lib/auth-token';
import { completeSignup } from '@/lib/signup-api';
import { useSignupStore } from '@/store/signup-store';

import SignupAgreementsPage from '../agreements/page';

const navigationMock = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router', () => ({ useNavigate: () => navigationMock.navigate }));

vi.mock('@/lib/signup-api', () => ({
  completeSignup: vi.fn(),
}));

describe('개인 회원가입 후 로그인 연결', () => {
  beforeEach(() => {
    navigationMock.navigate.mockClear();
    clearAccessToken();
    vi.mocked(completeSignup).mockResolvedValue(undefined);
    useSignupStore.getState().reset();
    useSignupStore
      .getState()
      .setAccount({ email: 'user@example.com', signupToken: 'signup-token' });
  });

  afterEach(() => {
    cleanup();
    clearAccessToken();
    vi.clearAllMocks();
  });

  it('필수 약관 동의 후 세션 생성 없이 로그인으로 이동한다', async () => {
    const user = userEvent.setup();

    render(<SignupAgreementsPage />);

    const submitButton = screen.getByRole('button', { name: '회원가입 완료' });
    expect(
      screen.getByText('2단계 · 정보 수집 및 이용에 대한 약관에 동의해주세요.'),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);
    await user.click(checkboxes[4]);
    await user.click(checkboxes[5]);

    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    await waitFor(() => {
      expect(completeSignup).toHaveBeenCalledWith({
        account: { email: 'user@example.com', signupToken: 'signup-token' },
        terms: expect.objectContaining({
          serviceTerms: true,
          privacyPolicy: true,
          individualTerms: true,
          aiAnalysisConsent: true,
          sensitiveDataConsent: true,
          marketingConsent: false,
        }),
      });
    });

    // 가입 완료 후 store는 reset됨 (AC4)
    expect(useSignupStore.getState().terms).toEqual({});
    expect(getAccessToken()).toBeNull();
    expect(getAuthRole()).toBeNull();
    expect(navigationMock.navigate).toHaveBeenCalledWith('/login', { replace: true });
    expect(navigationMock.navigate).not.toHaveBeenCalledWith('/signup/account-info', {
      replace: true,
    });
  });

  it('전체 동의는 개별 동의 상태에 따라 혼합 상태를 표시한다', async () => {
    const user = userEvent.setup();
    render(<SignupAgreementsPage />);

    const all = screen.getByRole('checkbox', { name: '모두 동의합니다.' });
    const marketing = screen.getByRole('checkbox', { name: /마케팅 정보 수신동의/ });
    const submitButton = screen.getByRole('button', { name: '회원가입 완료' });

    await user.click(screen.getByText('모두 동의합니다.'));
    expect(all).toBeChecked();
    expect(marketing).toBeChecked();
    await waitFor(() => expect(submitButton).toBeEnabled());

    await user.click(marketing);
    expect(all).toBePartiallyChecked();
    expect(marketing).not.toBeChecked();
    expect(submitButton).toBeEnabled();

    all.focus();
    await user.keyboard(' ');
    expect(all).toBeChecked();
    expect(marketing).toBeChecked();

    await user.keyboard(' ');
    expect(all).not.toBeChecked();
    expect(marketing).not.toBeChecked();
    await waitFor(() => expect(submitButton).toBeDisabled());
  });

  it('signupToken이 없으면 account-info로 리다이렉트된다 (AC11)', async () => {
    useSignupStore.getState().reset(); // signupToken 제거

    render(<SignupAgreementsPage />);

    await waitFor(() => {
      expect(navigationMock.navigate).toHaveBeenCalledWith('/signup/account-info', {
        replace: true,
      });
    });
    expect(completeSignup).not.toHaveBeenCalled();
  });

  it('회원가입 완료 요청이 실패하면 동의 항목을 유지하고 다시 제출할 수 있다', async () => {
    const user = userEvent.setup();
    vi.mocked(completeSignup).mockRejectedValueOnce(new Error('signup failed'));

    render(<SignupAgreementsPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);
    await user.click(checkboxes[4]);
    await user.click(checkboxes[5]);
    await user.click(screen.getByRole('button', { name: '회원가입 완료' }));

    expect(
      await screen.findByText('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    ).toBeInTheDocument();
    expect(navigationMock.navigate).not.toHaveBeenCalled();
    expect(checkboxes[1]).toBeChecked();

    await user.click(screen.getByRole('button', { name: '회원가입 완료' }));
    expect(completeSignup).toHaveBeenCalledTimes(2);
    expect(navigationMock.navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
