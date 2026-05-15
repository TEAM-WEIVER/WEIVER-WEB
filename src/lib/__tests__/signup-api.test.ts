import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  initApplicantSignup,
  sendApplicantVerificationEmail,
  verifyApplicantEmail,
} from '../signup-api';

describe('initApplicantSignup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('회원가입 1단계 계정 정보 등록 요청을 서버 스펙에 맞게 보낸다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          code: 200,
          data: {
            signupToken: '123e4567-e89b-12d3-a456-426614174000',
          },
          message: 'OK',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      initApplicantSignup({
        email: 'applicant@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        verificationToken: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).resolves.toEqual({
      status: 'OK',
      code: 200,
      data: {
        signupToken: '123e4567-e89b-12d3-a456-426614174000',
      },
      message: 'OK',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.piuda.site/api/auth/applicants/signup/init',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'applicant@example.com',
          password: 'Password123!',
          passwordConfirm: 'Password123!',
          verificationToken: '123e4567-e89b-12d3-a456-426614174000',
        }),
      },
    );
  });

  it('이메일 인증번호 전송 요청을 서버 스펙에 맞게 보낸다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          code: 200,
          data: 'sent',
          message: 'OK',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(sendApplicantVerificationEmail('applicant@example.com')).resolves.toEqual({
      status: 'OK',
      code: 200,
      data: 'sent',
      message: 'OK',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.piuda.site/api/auth/applicants/email/send',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'applicant@example.com',
        }),
      },
    );
  });

  it('이메일 인증번호 검증 요청을 서버 스펙에 맞게 보낸다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          code: 200,
          data: {
            verificationToken: '123e4567-e89b-12d3-a456-426614174000',
          },
          message: 'OK',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      verifyApplicantEmail({
        email: 'applicant@example.com',
        code: '131412',
      }),
    ).resolves.toEqual({
      status: 'OK',
      code: 200,
      data: {
        verificationToken: '123e4567-e89b-12d3-a456-426614174000',
      },
      message: 'OK',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.piuda.site/api/auth/applicants/email/verify',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'applicant@example.com',
          code: '131412',
        }),
      },
    );
  });
});
