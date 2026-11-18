import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useTimer } from '@/hooks/use-timer';
import { ApiError } from '@/lib/api-client';
import { sendPasswordResetCode, verifyPasswordResetCode } from '@/lib/applicant-account-api';

const CODE_LIFETIME_SECONDS = 300;
const RESEND_INTERVAL_SECONDS = 60;

const verificationErrors: Record<string, string> = {
  INVALID_VERIFICATION_CODE: '인증번호가 올바르지 않습니다. 다시 확인해주세요.',
  VERIFICATION_CODE_EXPIRED: '인증번호가 만료되었습니다. 다시 전송해주세요.',
  TOO_MANY_VERIFICATION_ATTEMPTS: '인증 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
  TOO_MANY_EMAIL_REQUESTS: '인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
};

interface EmailVerificationFormProps {
  initialEmail?: string;
  notice?: string;
  onVerified: (email: string, verificationToken: string) => void;
}

export function EmailVerificationForm({
  initialEmail = '',
  notice,
  onVerified,
}: EmailVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState(notice);
  const [action, setAction] = useState<'send' | 'verify' | null>(null);
  const requestInProgress = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const timer = useTimer(CODE_LIFETIME_SECONDS);

  const canResend = timer.seconds <= CODE_LIFETIME_SECONDS - RESEND_INTERVAL_SECONDS;
  const canVerify = code.length === 6 && timer.isRunning;

  useEffect(() => {
    if (codeSent) codeInput.current?.focus();
  }, [codeSent]);

  async function request(nextAction: 'send' | 'verify') {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || requestInProgress.current) return;
    if (nextAction === 'send' ? !canResend : !canVerify) return;

    requestInProgress.current = true;
    setAction(nextAction);
    setError(undefined);

    try {
      if (nextAction === 'send') {
        await sendPasswordResetCode(normalizedEmail);
        setCode('');
        setCodeSent(true);
        timer.start();
      } else {
        const { data } = await verifyPasswordResetCode(normalizedEmail, code);
        if (!data?.verificationToken) throw new Error('Missing verification token');
        onVerified(normalizedEmail, data.verificationToken);
      }
    } catch (error) {
      const errorCode = error instanceof ApiError ? error.apiStatus : undefined;
      if (
        errorCode === 'VERIFICATION_CODE_EXPIRED' ||
        errorCode === 'TOO_MANY_VERIFICATION_ATTEMPTS'
      ) {
        timer.reset();
      }
      const fallback =
        nextAction === 'send'
          ? '인증번호를 전송하지 못했습니다. 잠시 후 다시 시도해주세요.'
          : '인증번호를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.';
      setError((errorCode && verificationErrors[errorCode]) || fallback);
    } finally {
      requestInProgress.current = false;
      setAction(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void request(codeSent ? 'verify' : 'send');
  }

  function editEmail() {
    setCodeSent(false);
    setCode('');
    setError(undefined);
    timer.reset();
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={action !== null} className="flex flex-col gap-4">
      <FormField label="이메일">
        {(field) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              {...field}
              type="email"
              name="email"
              autoComplete="email"
              variant="default"
              placeholder="이메일을 입력해주세요."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={codeSent || action !== null}
              required
            />
            {codeSent ? (
              <Button
                type="button"
                variant="outline"
                onClick={editEmail}
                disabled={action !== null}
              >
                이메일 변경
              </Button>
            ) : (
              <Button type="submit" disabled={!email.trim() || action !== null}>
                {action === 'send' ? '전송 중' : '인증번호 받기'}
              </Button>
            )}
          </div>
        )}
      </FormField>

      {codeSent ? (
        <div className="bg-bg-tertiary flex flex-col gap-3 rounded-xl p-3.5">
          <p role="status" className="text-caption text-text-secondary">
            등록된 이메일이라면 인증번호가 발송됩니다.
          </p>
          <FormField label="인증번호">
            {(field) => (
              <Input
                {...field}
                ref={codeInput}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                variant="default"
                className="bg-card"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                readOnly={action !== null || !timer.isRunning}
                placeholder="인증번호 6자리"
                required
              />
            )}
          </FormField>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {timer.isRunning ? (
              <span role="timer" className="text-caption text-error tabular-nums">
                <span className="sr-only">인증 남은 시간 </span>
                {timer.formatted}
              </span>
            ) : (
              <p className="text-caption text-text-secondary">인증번호를 다시 받아주세요.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!canResend || action !== null}
              onClick={() => void request('send')}
            >
              {action === 'send' ? '재전송 중' : '재전송'}
            </Button>
          </div>
          <Button type="submit" disabled={!canVerify || action !== null}>
            {action === 'verify' ? '확인 중' : '인증번호 확인'}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
