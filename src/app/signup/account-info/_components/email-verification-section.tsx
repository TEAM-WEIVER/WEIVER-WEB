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
  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="이메일을 입력해주세요." error={emailError}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            {...emailInputProps}
            placeholder="personal@gmail.com"
            disabled={verification.isEmailVerified}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={() => void verification.sendVerification()}
            disabled={verification.isEmailVerified || !watchedEmail || verification.isSending}
            className="w-full rounded-lg sm:w-24"
          >
            {verification.isSending ? '전송 중' : '인증하기'}
          </Button>
        </div>
      </FormField>
      {verification.sendError ? (
        <p className="text-caption text-error">{verification.sendError}</p>
      ) : null}

      {verification.isCodeSent ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-4">
            <Label className="text-text-primary">인증 코드를 입력해주세요.</Label>
            {verification.timer.isRunning ? (
              <span className="text-caption text-error">
                {verification.timer.formatted} 제한시간
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verification.verificationCode}
              onChange={(event) => verification.updateVerificationCode(event.target.value)}
              placeholder="숫자 6자리"
              disabled={verification.isEmailVerified}
              className="flex-1"
            />
            {!verification.isEmailVerified ? (
              <Button
                type="button"
                onClick={() => void verification.verifyCode()}
                disabled={
                  verification.verificationCode.length !== 6 ||
                  !verification.timer.isRunning ||
                  verification.isVerifying
                }
                className="w-full rounded-lg sm:w-24"
              >
                {verification.isVerifying ? '확인 중' : '확인'}
              </Button>
            ) : null}
          </div>
          {verification.verifyError ? (
            <p className="text-caption text-error">{verification.verifyError}</p>
          ) : null}
          {verification.isEmailVerified ? (
            <p className="text-caption text-success">이메일이 인증되었습니다.</p>
          ) : null}
          {!verification.timer.isRunning &&
          !verification.isEmailVerified &&
          verification.isCodeSent &&
          verification.timer.seconds === 0 ? (
            <p className="text-caption text-error">
              인증 시간이 만료되었습니다. 다시 인증해주세요.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
