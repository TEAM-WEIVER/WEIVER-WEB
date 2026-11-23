import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-client';
import { clearAccessToken, getAccessToken, getAuthRole } from '@/lib/auth-token';
import { completeKakaoSignup, exchangeKakaoOAuth, startKakaoOAuth } from '@/lib/kakao-auth-api';
import { clearKakaoSignup, getKakaoSignup, KAKAO_FLOW_KEY } from '@/lib/kakao-auth-flow';
import { sendApplicantVerificationEmail, verifyApplicantEmail } from '@/lib/signup-api';
import LoginPage from '@/pages/login/page';
import KakaoSignupPage from '@/pages/signup/kakao/page';

import KakaoReturnPage from '../kakao/return/page';

vi.mock('@/lib/kakao-auth-api', () => ({
  startKakaoOAuth: vi.fn(),
  exchangeKakaoOAuth: vi.fn(),
  completeKakaoSignup: vi.fn(),
}));
vi.mock('@/lib/signup-api', () => ({
  sendApplicantVerificationEmail: vi.fn(),
  verifyApplicantEmail: vi.fn(),
}));

function renderFlow(path = '/auth/kakao/return') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/kakao/return" element={<KakaoReturnPage />} />
          <Route path="/signup/kakao" element={<KakaoSignupPage />} />
          <Route path="/home" element={<h1>회원 홈</h1>} />
          <Route path="/signup/account-info" element={<h1>이메일 회원가입</h1>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

async function agreeToRequiredTerms(user: ReturnType<typeof userEvent.setup>) {
  const checkboxes = await screen.findAllByRole('checkbox');
  for (const checkbox of checkboxes.slice(1, 6)) await user.click(checkbox);
  await waitFor(() => expect(screen.getByRole('button', { name: '회원가입 완료' })).toBeEnabled());
}

describe('카카오 로그인과 신규 가입', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearKakaoSignup();
    clearAccessToken();
    sessionStorage.clear();
    sessionStorage.setItem(KAKAO_FLOW_KEY, 'flow-id');
    vi.mocked(exchangeKakaoOAuth).mockResolvedValue({
      status: 'SIGNUP_REQUIRED',
      signupToken: 'signup-token',
      verifiedEmail: 'kakao@example.com',
    });
    vi.mocked(completeKakaoSignup).mockResolvedValue({
      accessToken: 'kakao-access',
      role: 'APPLICANT',
    });
    vi.mocked(sendApplicantVerificationEmail).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'sent',
      message: 'OK',
    });
    vi.mocked(verifyApplicantEmail).mockResolvedValue({
      status: 'success',
      code: 200,
      data: { verificationToken: 'email-token' },
      message: 'OK',
    });
  });

  afterEach(() => {
    cleanup();
    clearKakaoSignup();
    clearAccessToken();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('StrictMode 복귀에서 exchange를 한 번만 호출하고 기존 회원 세션을 반영한다', async () => {
    vi.mocked(exchangeKakaoOAuth).mockResolvedValue({
      status: 'LOGGED_IN',
      accessToken: 'existing-access',
      role: 'APPLICANT',
    });
    renderFlow();
    expect(await screen.findByRole('heading', { name: '회원 홈' })).toBeInTheDocument();
    expect(exchangeKakaoOAuth).toHaveBeenCalledExactlyOnceWith('flow-id');
    expect(sessionStorage.getItem(KAKAO_FLOW_KEY)).toBeNull();
    expect(getAccessToken()).toBe('existing-access');
    expect(getAuthRole()).toBe('APPLICANT');
  });

  it('필수 동의만으로 비밀번호 없이 가입하고 마케팅 거부를 유지한다', async () => {
    const user = userEvent.setup();
    renderFlow();
    const submit = await screen.findByRole('button', { name: '회원가입 완료' });
    expect(submit).toBeDisabled();
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
    expect(JSON.stringify(sessionStorage)).not.toContain('signup-token');
    await agreeToRequiredTerms(user);
    await user.dblClick(submit);
    expect(await screen.findByRole('heading', { name: '회원 홈' })).toBeInTheDocument();
    expect(completeKakaoSignup).toHaveBeenCalledExactlyOnceWith(
      'signup-token',
      expect.objectContaining({ marketingConsent: false }),
      undefined,
    );
    expect(getAccessToken()).toBe('kakao-access');
    expect(getKakaoSignup()).toBeNull();
  });

  it('카카오 이메일이 없으면 6자리 문자열 코드를 검증한 뒤 같은 이메일과 인증 토큰을 사용한다', async () => {
    const user = userEvent.setup();
    vi.mocked(exchangeKakaoOAuth).mockResolvedValue({
      status: 'SIGNUP_REQUIRED',
      signupToken: 'signup-token',
    });
    renderFlow();
    await user.type(await screen.findByRole('textbox', { name: '이메일' }), 'user@example.com');
    expect(screen.queryByRole('button', { name: '회원가입 완료' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '이메일 인증' }));
    await user.type(await screen.findByRole('textbox', { name: '이메일 인증번호' }), '012345');
    await user.click(screen.getByRole('button', { name: '인증번호 확인' }));
    expect(verifyApplicantEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '012345',
    });
    await user.click(screen.getByRole('button', { name: '약관 동의로 계속' }));
    await agreeToRequiredTerms(user);
    await user.click(screen.getByRole('button', { name: '회원가입 완료' }));
    expect(await screen.findByRole('heading', { name: '회원 홈' })).toBeInTheDocument();
    expect(completeKakaoSignup).toHaveBeenCalledWith('signup-token', expect.anything(), {
      email: 'user@example.com',
      verificationToken: 'email-token',
    });
  });

  it.each([
    [new ApiError('not verified', 403, 'EMAIL_NOT_VERIFIED'), '이메일 인증을 확인할 수 없습니다.'],
    [new TypeError('Network failed'), '카카오 인증에 연결하지 못했습니다.'],
  ])(
    '가입 완료 실패 후 소비한 토큰을 화면 재진입으로 재전송하지 않는다 (%s)',
    async (error, message) => {
      const user = userEvent.setup();
      vi.mocked(completeKakaoSignup).mockRejectedValue(error);
      const view = renderFlow();
      await agreeToRequiredTerms(user);
      await user.click(screen.getByRole('button', { name: '회원가입 완료' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(getKakaoSignup()).toBeNull();
      view.unmount();
      renderFlow('/signup/kakao');
      expect(screen.getByRole('alert')).toHaveTextContent('가입 정보가 없거나 만료되었습니다.');
      expect(completeKakaoSignup).toHaveBeenCalledTimes(1);
    },
  );

  it('가입 요청 중 화면을 다시 열어도 이미 제출한 토큰을 사용할 수 없다', async () => {
    const user = userEvent.setup();
    let finish!: (session: { accessToken: string; role: 'APPLICANT' }) => void;
    vi.mocked(completeKakaoSignup).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = renderFlow();
    await agreeToRequiredTerms(user);
    const form = screen.getByRole('button', { name: '회원가입 완료' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(completeKakaoSignup).toHaveBeenCalledTimes(1));
    view.unmount();
    renderFlow('/signup/kakao');
    expect(screen.getByRole('alert')).toHaveTextContent('가입 정보가 없거나 만료되었습니다.');
    await act(async () => finish({ accessToken: 'late-access', role: 'APPLICANT' }));
    expect(getAccessToken()).toBeNull();
  });

  it('가입 화면을 오래 열어두어 토큰이 만료되면 완료 요청을 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderFlow();
    await agreeToRequiredTerms(user);
    const afterExpiry = Date.now() + 10 * 60 * 1000 + 1;
    vi.spyOn(Date, 'now').mockReturnValue(afterExpiry);
    await user.click(screen.getByRole('button', { name: '회원가입 완료' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '카카오 가입 정보가 만료되었습니다.',
    );
    expect(completeKakaoSignup).not.toHaveBeenCalled();
  });

  it('구직자가 아닌 세션은 로그인 상태로 반영하지 않는다', async () => {
    vi.mocked(exchangeKakaoOAuth).mockResolvedValue({
      status: 'LOGGED_IN',
      accessToken: 'company-token',
      role: 'COMPANY',
    });
    renderFlow();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '구직자 로그인 정보를 확인할 수 없습니다.',
    );
    expect(getAccessToken()).toBeNull();
    expect(getAuthRole()).toBeNull();
  });

  it.each([
    ['EXISTING_ACCOUNT', '기존 방식으로 로그인한 뒤'],
    ['PENDING_ACCOUNT', '이메일 회원가입을 다시'],
  ] as const)('%s는 자동 가입하지 않고 기존 계정 복구 경로를 안내한다', async (status, message) => {
    vi.mocked(exchangeKakaoOAuth).mockResolvedValue({ status, verifiedEmail: 'user@example.com' });
    renderFlow();
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(completeKakaoSignup).not.toHaveBeenCalled();
  });

  it('카카오 동의 취소 후 로그인 화면에서 다시 시작할 수 있고 새로고침으로 교환을 반복하지 않는다', async () => {
    vi.mocked(exchangeKakaoOAuth).mockRejectedValue(
      new ApiError('cancelled', 400, 'KAKAO_OAUTH_CANCELLED'),
    );
    const view = renderFlow();
    expect(await screen.findByRole('alert')).toHaveTextContent('카카오 로그인을 취소했습니다.');
    view.unmount();
    renderFlow();
    expect(await screen.findByRole('alert')).toHaveTextContent('카카오로 다시 시작해주세요.');
    expect(exchangeKakaoOAuth).toHaveBeenCalledTimes(1);
  });

  it('시작 버튼 연속 클릭을 막고 API 실패 후 다시 활성화한다', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(startKakaoOAuth).mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    renderFlow('/login');
    const button = screen.getByRole('button', { name: '카카오로 시작하기' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(startKakaoOAuth).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => reject(new ApiError('unavailable', 503, 'KAKAO_OAUTH_UNAVAILABLE')));
    expect(button).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('카카오 인증을 완료하지 못했습니다.');
  });

  it('탭 저장소를 사용할 수 없으면 OAuth 시작 요청 전 오류를 안내한다', async () => {
    vi.spyOn(Object.getPrototypeOf(window.sessionStorage), 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    renderFlow('/login');
    fireEvent.click(screen.getByRole('button', { name: '카카오로 시작하기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 화면에서 다시 시작해주세요.',
    );
    expect(startKakaoOAuth).not.toHaveBeenCalled();
  });
});
