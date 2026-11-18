import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api-client';
import { resetPassword } from '@/lib/applicant-account-api';
import { type PasswordResetData, passwordResetSchema } from '@/schemas/password-reset';

interface NewPasswordFormProps {
  email: string;
  verificationToken: string;
  onRestart: (notice?: string) => void;
  onSuccess: () => void;
}

export function NewPasswordForm({
  email,
  verificationToken,
  onRestart,
  onSuccess,
}: NewPasswordFormProps) {
  const [error, setError] = useState<string>();
  const requestInProgress = useRef(false);
  const {
    register,
    setFocus,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { newPassword: '', newPasswordConfirm: '' },
  });

  useEffect(() => {
    setFocus('newPassword');
  }, [setFocus]);

  const submit = handleSubmit(async (passwords) => {
    setError(undefined);
    try {
      await resetPassword({ email, verificationToken, ...passwords });
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.apiStatus === 'EMAIL_NOT_VERIFIED') {
        onRestart('이메일 인증이 만료되었거나 이미 사용되었습니다. 다시 인증해주세요.');
        return;
      }
      setError('비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  });

  return (
    <form
      noValidate
      aria-busy={isSubmitting}
      onSubmit={(event) => {
        event.preventDefault();
        if (requestInProgress.current) return;
        requestInProgress.current = true;
        void submit(event).finally(() => {
          requestInProgress.current = false;
        });
      }}
      className="flex flex-col gap-4"
    >
      <FormField label="새 비밀번호" error={errors.newPassword?.message}>
        {(field) => (
          <PasswordInput
            {...register('newPassword')}
            {...field}
            variant="default"
            autoComplete="new-password"
            visibilityLabel="새 비밀번호"
            placeholder="영문/숫자/특수문자 포함 8~64자"
            readOnly={isSubmitting}
            required
          />
        )}
      </FormField>
      <FormField label="새 비밀번호 확인" error={errors.newPasswordConfirm?.message}>
        {(field) => (
          <PasswordInput
            {...register('newPasswordConfirm')}
            {...field}
            variant="default"
            autoComplete="new-password"
            visibilityLabel="새 비밀번호 확인"
            placeholder="비밀번호를 다시 입력해주세요."
            readOnly={isSubmitting}
            required
          />
        )}
      </FormField>
      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '변경 중' : '비밀번호 변경'}
      </Button>
      <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onRestart()}>
        이메일 다시 인증
      </Button>
    </form>
  );
}
