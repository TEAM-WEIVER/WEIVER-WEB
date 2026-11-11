import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-client';
import { sendApplicantVerificationEmail, verifyApplicantEmail } from '@/lib/signup-api';

import { useEmailVerification } from '../use-email-verification';

vi.mock('@/lib/signup-api', () => ({
  sendApplicantVerificationEmail: vi.fn(),
  verifyApplicantEmail: vi.fn(),
}));

describe('useEmailVerification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(sendApplicantVerificationEmail).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: 'sent',
      message: 'OK',
    });
    vi.mocked(verifyApplicantEmail).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: { verificationToken: 'token-abc' },
      message: 'OK',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('초기 상태에서 isEmailVerified는 false이다', () => {
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    expect(result.current.isEmailVerified).toBe(false);
    expect(result.current.sendCount).toBe(0);
    expect(result.current.isSendLimitReached).toBe(false);
  });

  it('sendVerification 호출 시 API를 호출하고 sendCount가 증가한다', async () => {
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    await act(async () => {
      await result.current.sendVerification();
    });

    expect(sendApplicantVerificationEmail).toHaveBeenCalledWith('user@example.com');
    expect(result.current.sendCount).toBe(1);
    expect(result.current.isCodeSent).toBe(true);
  });

  it('sendCount가 3이상인 상태에서 sendVerification 호출 시 API를 호출하지 않고 횟수 초과 메시지를 설정한다', async () => {
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    // 3회 전송
    await act(async () => {
      await result.current.sendVerification();
    });
    await act(async () => {
      await result.current.sendVerification();
    });
    await act(async () => {
      await result.current.sendVerification();
    });

    expect(result.current.sendCount).toBe(3);
    expect(result.current.isSendLimitReached).toBe(true);

    vi.mocked(sendApplicantVerificationEmail).mockClear();

    // 4번째 시도
    await act(async () => {
      await result.current.sendVerification();
    });

    expect(sendApplicantVerificationEmail).not.toHaveBeenCalled();
    expect(result.current.sendError).toBe(
      '인증번호 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('verifyCode 성공 시 isEmailVerified가 true가 된다', async () => {
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    // sendVerification 호출로 타이머 시작
    await act(async () => {
      await result.current.sendVerification();
    });

    // fake timer를 조금 앞으로 이동해 setInterval tick 실행 (타이머가 isRunning 상태)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.updateVerificationCode('123456');
    });

    await act(async () => {
      await result.current.verifyCode();
    });

    expect(result.current.isEmailVerified).toBe(true);
    expect(result.current.verificationToken).toBe('token-abc');
  });

  it('API 전송 실패 시 sendError가 설정된다', async () => {
    vi.mocked(sendApplicantVerificationEmail).mockRejectedValueOnce(new Error('send failed'));
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    await act(async () => {
      await result.current.sendVerification();
    });

    expect(result.current.sendError).toBe(
      '인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
    expect(result.current.isCodeSent).toBe(false);
  });

  it('이미 등록된 이메일이면 중복 이메일 메시지를 설정한다', async () => {
    vi.mocked(sendApplicantVerificationEmail).mockRejectedValueOnce(new ApiError('conflict', 409));
    const { result } = renderHook(() => useEmailVerification('user@example.com'));

    await act(async () => {
      await result.current.sendVerification();
    });

    expect(result.current.sendError).toBe('conflict');
    expect(result.current.isCodeSent).toBe(false);
  });
});
