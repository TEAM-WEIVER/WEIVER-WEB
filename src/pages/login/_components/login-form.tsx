import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { UseLoginFormReturn } from '../_hooks/use-login-form';

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
}: UseLoginFormReturn) {
  const emailInputId = 'login-email';
  const passwordInputId = 'login-password';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[34px]">
      <h1 className="text-h2 text-text-secondary">로그인</h1>

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={emailInputId} className="text-body1 text-text-primary">
            이메일
          </label>
          <Input
            id={emailInputId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={passwordInputId} className="text-body1 text-text-primary">
            비밀번호
          </label>
          <div className="relative">
            <Input
              id={passwordInputId}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="올바른 비밀번호를 입력하세요"
              className="pr-14"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-text-disabled hover:text-text-tertiary absolute top-1/2 right-5 -translate-y-1/2 cursor-pointer transition-colors"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>
      </div>

      {loginError ? (
        <p role="alert" className="text-body3 text-destructive">
          {loginError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={!isFormValid || isSubmitting}>
        {isSubmitting ? '로그인 중...' : '로그인하기'}
      </Button>
    </form>
  );
}
