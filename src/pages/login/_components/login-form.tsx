import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

import type { UseLoginFormReturn } from '../_hooks/use-login-form';
import { LoginOptions } from './login-options';

type LoginFormProps = UseLoginFormReturn & { defaultPasswordVisible?: boolean };

const errorMessages = {
  credentials: '이메일 또는 비밀번호가 일치하지 않습니다.',
  request: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
};

const inputClassName =
  'border-border-light placeholder:text-text-tertiary h-14 px-3.5 max-sm:text-base';

export function LoginForm({
  email,
  password,
  rememberEmail,
  loginError,
  isSubmitting,
  setEmail,
  setPassword,
  setRememberEmail,
  handleSubmit,
  defaultPasswordVisible,
}: LoginFormProps) {
  const id = useId();
  const emailInputId = `${id}-email`;
  const passwordInputId = `${id}-password`;
  const errorId = `${id}-error`;
  const hasCredentialError = loginError === 'credentials';
  const submitLabel = isSubmitting ? '로그인 중...' : '로그인';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={emailInputId} className="text-body2 text-text-secondary">
          이메일
        </label>
        <Input
          id={emailInputId}
          name="email"
          type="email"
          variant="default"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일을 입력해주세요."
          className={inputClassName}
          autoComplete="username"
          required
          readOnly={isSubmitting}
          aria-invalid={hasCredentialError || undefined}
          aria-describedby={hasCredentialError ? errorId : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={passwordInputId} className="text-body2 text-text-secondary">
          비밀번호
        </label>
        <PasswordInput
          id={passwordInputId}
          name="password"
          variant="default"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호를 입력해주세요."
          className={inputClassName}
          autoComplete="current-password"
          defaultVisible={defaultPasswordVisible}
          pattern=".*\S.*"
          required
          readOnly={isSubmitting}
          aria-invalid={hasCredentialError || undefined}
          aria-describedby={hasCredentialError ? errorId : undefined}
        />
        {loginError ? (
          <p id={errorId} role="alert" className="text-caption text-destructive">
            {errorMessages[loginError]}
          </p>
        ) : null}
      </div>

      <LoginOptions
        rememberEmail={rememberEmail}
        onRememberEmailChange={setRememberEmail}
        disabled={isSubmitting}
      />

      <Button type="submit" className="w-full" isLoading={isSubmitting} aria-label={submitLabel}>
        {submitLabel}
      </Button>
    </form>
  );
}
