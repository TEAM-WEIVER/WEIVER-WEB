import { useState } from 'react';

import { useTimer } from '@/hooks/use-timer';
import { sendApplicantVerificationEmail, verifyApplicantEmail } from '@/lib/signup-api';

export function useEmailVerification(email: string) {
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const timer = useTimer(300);

  const isEmailVerified = email !== '' && verifiedEmail === email;
  const isCodeSent = email !== '' && sentEmail === email;

  const sendVerification = async () => {
    if (!email || isSending) return;

    setIsSending(true);
    setSendError(null);
    setVerifyError(null);

    try {
      await sendApplicantVerificationEmail(email);
      setSentEmail(email);
      setVerifiedEmail(null);
      setVerificationToken('');
      setVerificationCode('');
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
      setVerifyError('인증번호 확인에 실패했습니다. 다시 확인해주세요.');
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
    timer,
    sendVerification,
    verifyCode,
    updateVerificationCode,
  };
}
