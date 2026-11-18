import { type ReactNode, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { UseLoginFormReturn } from '../_hooks/use-login-form';

type LoginFormProps = UseLoginFormReturn & { formOptions?: ReactNode };

const errorMessages = {
  credentials: '이메일 또는 비밀번호가 일치하지 않습니다.',
  request: '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
};

const inputClassName =
  'border-border-light placeholder:text-text-tertiary h-14 px-3.5 max-sm:text-base';

export function LoginForm({
  showPassword,
  email,
  password,
  loginError,
  isSubmitting,
  isFormValid,
  setEmail,
  setPassword,
  setShowPassword,
  handleSubmit,
  formOptions,
}: LoginFormProps) {
  const id = useId();
  const emailInputId = `${id}-email`;
  const passwordInputId = `${id}-password`;
  const errorId = `${id}-error`;
  const hasCredentialError = loginError === 'credentials';
  const submitLabel = isSubmitting ? '로그인 중...' : '로그인';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor={passwordInputId} className="text-body2 text-text-secondary">
          비밀번호
        </label>
        <div className="relative">
          <Input
            id={passwordInputId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            variant="default"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력해주세요."
            className={`${inputClassName} pr-12`}
            autoComplete="current-password"
            required
            readOnly={isSubmitting}
            aria-invalid={hasCredentialError || undefined}
            aria-describedby={hasCredentialError ? errorId : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-text-tertiary hover:text-text-secondary focus-visible:outline-primary-600 absolute inset-y-1 right-1 grid w-10 cursor-pointer place-items-center rounded-md focus-visible:outline-2"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-controls={passwordInputId}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={22} />
            ) : (
              <Eye aria-hidden="true" size={22} />
            )}
          </button>
        </div>
        {loginError ? (
          <p id={errorId} role="alert" className="text-caption text-destructive">
            {errorMessages[loginError]}
          </p>
        ) : null}
      </div>

      {formOptions}

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid}
        isLoading={isSubmitting}
        aria-label={submitLabel}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
