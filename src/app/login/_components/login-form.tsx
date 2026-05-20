import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { LoginTabs } from './login-tabs';
import type { UseLoginFormReturn } from '../_hooks/use-login-form';

export function LoginForm({
  activeTab,
  currentTab,
  showPassword,
  rememberMe,
  accountId,
  password,
  loginError,
  isSubmitting,
  isFormValid,
  setAccountId,
  setPassword,
  setRememberMe,
  setShowPassword,
  handleTabChange,
  handleSubmit,
}: UseLoginFormReturn) {
  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[34px]">
      <LoginTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex flex-col items-center gap-3.5">
        <h1 className="text-h2 text-text-secondary">로그인하고 AI 채용 서비스를 만나보세요.</h1>
        <p className="text-body2 text-text-tertiary">{currentTab.description}</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-body1 text-text-primary">{currentTab.accountLabel}</label>
          <Input
            type={activeTab === 'individual' ? 'email' : 'text'}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder={currentTab.accountPlaceholder}
            autoComplete={currentTab.accountAutoComplete}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body1 text-text-primary">비밀번호</label>
          <div className="relative">
            <Input
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

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <span
              className={`flex h-[22px] w-[22px] items-center justify-center rounded border transition-colors ${
                rememberMe ? 'border-primary-700 bg-primary-700' : 'border-border-default bg-white'
              }`}
            >
              {rememberMe ? (
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5L5 9L13 1"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            <span className="text-body3 text-text-secondary">로그인 정보 저장</span>
          </label>
          <Button type="button" variant="link">
            비밀번호를 잊으셨나요?
          </Button>
        </div>
      </div>

      {loginError ? <p className="text-body3 text-destructive">{loginError}</p> : null}

      <Button type="submit" size="md" disabled={!isFormValid || isSubmitting}>
        {isSubmitting ? '로그인 중...' : '로그인하기'}
      </Button>
    </form>
  );
}
