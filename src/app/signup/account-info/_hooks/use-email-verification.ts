import { useEffect, useRef, useState } from 'react';

import { useTimer } from '@/hooks/use-timer';
import { sendApplicantVerificationEmail, verifyApplicantEmail } from '@/lib/signup-api';

const MAX_SEND_COUNT = 3;

export function useEmailVerification(email: string) {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const prevEmailRef = useRef(email);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const timer = useTimer(300);

  // M2/M3: 이메일 변경 시 인증 세션(타이머, sentEmail, sendCount) 리셋
  const timerReset = timer.reset;
  useEffect(() => {
    if (prevEmailRef.current === email) return;
    prevEmailRef.current = email;
    setSentEmail(null);
    setVerifiedEmail(null);
    setVerificationToken('');
    setVerificationCode('');
    setSendCount(0);
    setSendError(null);
    setVerifyError(null);
    timerReset();
  }, [email, timerReset]);

  const isEmailVerified = email !== '' && verifiedEmail === email;
  const isCodeSent = email !== '' && sentEmail === email;
  const isSendLimitReached = sendCount >= MAX_SEND_COUNT;

  const sendVerification = async () => {
    if (!email || isSending) return;

    if (isSendLimitReached) {
      setSendError('인증번호 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setVerifyError(null);

    try {
      await sendApplicantVerificationEmail(email);
      setSentEmail(email);
      setVerifiedEmail(null);
      setVerificationToken('');
      setVerificationCode('');
      setSendCount((c) => c + 1);
      timer.start();
    } catch {
      setSendError('인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6 || !timer.isRunning || isVerifying) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const response = await verifyApplicantEmail({ email, code: verificationCode });
      setVerificationToken(response.data.verificationToken);
      setVerifiedEmail(email);
      timer.reset();
    } catch {
      setVerifyError('인증번호가 올바르지 않습니다. 다시 확인해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const updateVerificationCode = (value: string) => {
    setVerificationCode(value.replace(/\D/g, ''));
  };

  return {
    isEmailVerified,
    isSending,
    isVerifying,
    sendError,
    verifyError,
    verificationToken,
    verificationCode,
    isCodeSent,
    sendCount,
    isSendLimitReached,
    timer,
    sendVerification,
    verifyCode,
    updateVerificationCode,
  };
}
