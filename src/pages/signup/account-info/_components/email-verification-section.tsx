import type { UseFormRegisterReturn } from 'react-hook-form';
import { KeyRound, Timer } from 'lucide-react';

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
    <div className="flex flex-col gap-4">
      <FormField
        id="email"
        label={
          <span className="text-body2">
            <span id="signup-email-label">이메일</span> <span aria-hidden="true">*</span>
          </span>
        }
        error={emailError}
      >
        {(field) => (
          <div className="flex gap-2">
            <Input
              type="email"
              {...emailInputProps}
              {...field}
              required
              autoComplete="email"
              aria-labelledby="signup-email-label"
              placeholder="weiver@gmail.com"
              readOnly={verification.isSending || verification.isVerifying}
              disabled={verification.isEmailVerified}
              className="bg-bg-primary h-[54px] px-3 text-sm leading-5"
            />
            <Button
              type="button"
              aria-label={verification.isSending ? '이메일 인증번호 전송 중' : '이메일 인증'}
              onClick={() => void verification.sendVerification()}
              disabled={
                verification.isEmailVerified ||
                !watchedEmail ||
                !!emailError ||
                verification.isSending ||
                verification.isCodeSent
              }
              className="bg-primary-800 h-[54px] min-w-[72px] rounded-lg px-3 text-sm font-medium sm:min-w-20"
            >
              {verification.isSending ? '전송 중' : '인증'}
            </Button>
          </div>
        )}
      </FormField>
      {verification.sendError ? (
        <p role="alert" className="text-caption text-error">
          {verification.sendError}
        </p>
      ) : null}

      {verification.isCodeSent ? (
        <div className="bg-bg-tertiary flex flex-col gap-1.5 rounded-xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <Label
              htmlFor="email-verification-code"
              className="text-text-secondary text-sm leading-5"
            >
              <span>
                인증번호 <span aria-hidden="true">*</span>
              </span>
            </Label>
            {timer.isRunning ? (
              <span
                role="timer"
                className="text-caption flex items-center gap-1 text-red-700 tabular-nums"
              >
                <Timer aria-hidden="true" size={15} />
                <span className="sr-only">인증 남은 시간 </span>
                {timer.formatted}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                id="email-verification-code"
                type="text"
                aria-label="이메일 인증번호"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verification.verificationCode}
                onChange={(event) => verification.updateVerificationCode(event.target.value)}
                placeholder="인증번호 6자리"
                readOnly={verification.isVerifying}
                disabled={verification.isEmailVerified || timer.isExpired}
                aria-invalid={Boolean(verification.verifyError)}
                aria-describedby={
                  verification.verifyError
                    ? 'verification-hint verification-error'
                    : 'verification-hint'
                }
                className="bg-bg-primary h-12 border-transparent px-3 pr-9 text-sm leading-5"
              />
              <KeyRound
                aria-hidden="true"
                size={17}
                className="text-icon-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
            {!verification.isEmailVerified ? (
              <Button
                type="button"
                aria-label={verification.isVerifying ? '인증번호 확인 중' : '인증번호 확인'}
                onClick={() => void verification.verifyCode()}
                disabled={
                  verification.verificationCode.length !== 6 ||
                  !timer.isRunning ||
                  verification.isVerifying
                }
                className="min-w-[60px] rounded-lg px-2 text-sm font-medium sm:min-w-[68px]"
              >
                {verification.isVerifying ? '확인 중' : '확인'}
              </Button>
            ) : null}
          </div>
          <p id="verification-hint" className="text-caption text-primary-600">
            이메일로 발송된 6자리 인증코드를 입력해주세요.
          </p>
          {verification.verifyError ? (
            <p role="alert" id="verification-error" className="text-caption text-red-700">
              {verification.verifyError}
            </p>
          ) : null}
          {verification.isEmailVerified ? (
            <p role="status" className="text-caption text-success">
              인증 완료
            </p>
          ) : null}
          {showResend ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-caption text-red-700">
                인증 시간이 만료되었습니다. 다시 인증해주세요.
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => void verification.sendVerification()}
                disabled={
                  verification.isSendLimitReached ||
                  verification.isSending ||
                  verification.isVerifying
                }
              >
                {verification.isSending ? '전송 중' : '재전송'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
