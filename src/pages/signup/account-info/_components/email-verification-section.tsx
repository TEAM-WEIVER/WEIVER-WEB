import type { UseFormRegisterReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { useEmailVerification } from '../_hooks/use-email-verification';

type EmailVerificationState = ReturnType<typeof useEmailVerification>;

interface EmailVerificationSectionProps {
  emailInputProps: UseFormRegisterReturn<'email'>;
  emailError?: string;
  watchedEmail: string;
  verification: EmailVerificationState;
}

export function EmailVerificationSection({
  emailInputProps,
  emailError,
  watchedEmail,
  verification,
}: EmailVerificationSectionProps) {
  const { timer } = verification;
  const showResend = verification.isCodeSent && timer.isExpired && !verification.isEmailVerified;

  return (
    <div className="flex flex-col gap-3.5">
      <FormField id="email" label="이메일" error={emailError}>
        {(field) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              {...emailInputProps}
              {...field}
              placeholder="personal@gmail.com"
              disabled={verification.isEmailVerified}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => void verification.sendVerification()}
              disabled={
                verification.isEmailVerified ||
                !watchedEmail ||
                !!emailError ||
                verification.isSending ||
                timer.isRunning
              }
              className="w-full rounded-lg sm:w-24"
            >
              {verification.isSending ? '전송 중' : '인증번호 전송'}
            </Button>
          </div>
        )}
      </FormField>
      {verification.sendError ? (
        <p className="text-caption text-error">{verification.sendError}</p>
      ) : null}

      {verification.isCodeSent ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4">
            <Label htmlFor="email-verification-code" className="text-text-primary">
              인증 코드를 입력해주세요.
            </Label>
            <span
              role="timer"
              aria-live="polite"
              className={
                timer.isRunning || (!verification.isEmailVerified && !timer.isExpired)
                  ? 'text-caption text-error'
                  : 'sr-only hidden'
              }
            >
              {timer.isRunning ? `${timer.formatted} 제한시간` : ''}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="email-verification-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verification.verificationCode}
              onChange={(event) => verification.updateVerificationCode(event.target.value)}
              placeholder="숫자 6자리"
              disabled={verification.isEmailVerified || timer.isExpired}
              aria-label="이메일 인증번호"
              aria-invalid={Boolean(verification.verifyError)}
              aria-describedby={verification.verifyError ? 'verification-error' : undefined}
              className="flex-1"
            />
            {!verification.isEmailVerified ? (
              <Button
                type="button"
                aria-label="인증번호 확인"
                onClick={() => void verification.verifyCode()}
                disabled={
                  verification.verificationCode.length !== 6 ||
                  !timer.isRunning ||
                  verification.isVerifying
                }
                className="w-full rounded-lg sm:w-24"
              >
                {verification.isVerifying ? '확인 중' : '확인'}
              </Button>
            ) : null}
          </div>
          {verification.verifyError ? (
            <p id="verification-error" className="text-caption text-error">
              {verification.verifyError}
            </p>
          ) : null}
          {verification.isEmailVerified ? (
            <p className="text-caption text-success">인증 완료</p>
          ) : null}
          {showResend ? (
            <div className="flex flex-col gap-1">
              <p className="text-caption text-error">
                인증 시간이 만료되었습니다. 다시 인증해주세요.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void verification.sendVerification()}
                disabled={verification.isSendLimitReached}
                className="w-full rounded-lg sm:w-24"
              >
                재전송
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
