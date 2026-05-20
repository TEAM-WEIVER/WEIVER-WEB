'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/common/header';
import { loginCompany } from '@/lib/login-api';
import { getFirstStep } from '@/lib/signup-flow';

const TAB_CONTENT = {
  corporate: {
    description: '가장 적합한 지원자를 빠르고 정확하게 확인해보세요.',
    accountLabel: '아이디',
    accountPlaceholder: 'weiver',
    accountAutoComplete: 'username',
  },
  individual: {
    description: '나에게 가장 알맞는 공고를 확인해보세요.',
    accountLabel: '이메일',
    accountPlaceholder: 'personal@gmail.com',
    accountAutoComplete: 'email',
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'corporate' | 'individual'>('corporate');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTab = TAB_CONTENT[activeTab];

  const trimmedAccountId = accountId.trim();
  const isFormValid = trimmedAccountId !== '' && password.trim() !== '';

  const handleTabChange = (tab: 'corporate' | 'individual') => {
    setActiveTab(tab);
    setLoginError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setLoginError(null);

    try {
      if (activeTab === 'corporate') {
        await loginCompany({
          id: trimmedAccountId,
          password,
        });
        router.push('/corporate/dashboard');
        return;
      }

      setLoginError('개인 회원 로그인은 아직 준비 중입니다.');
    } catch {
      setLoginError('로그인에 실패했습니다. 아이디와 비밀번호를 다시 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="flex justify-center pt-[113px] pb-20">
        <div className="border-border-light bg-bg-primary w-[628px] rounded-[20px] border px-16 py-11">
          <div className="flex w-[500px] flex-col gap-6">
            {/* 상단 섹션 */}
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[34px]">
              {/* 탭 바 */}
              <div className="bg-primary-100 flex w-full items-center gap-1.5 rounded-full p-1.5">
                <button
                  type="button"
                  onClick={() => handleTabChange('corporate')}
                  className={`text-h4 flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    activeTab === 'corporate'
                      ? 'bg-primary-700 text-text-inverse'
                      : 'text-text-tertiary'
                  }`}
                >
                  기업 회원
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('individual')}
                  className={`text-h4 flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    activeTab === 'individual'
                      ? 'bg-primary-700 text-text-inverse'
                      : 'text-text-tertiary'
                  }`}
                >
                  개인 회원
                </button>
              </div>

              {/* 타이틀 */}
              <div className="flex flex-col items-center gap-3.5">
                <h1 className="text-h2 text-text-secondary">
                  로그인하고 AI 채용 서비스를 만나보세요.
                </h1>
                <p className="text-body2 text-text-tertiary">{currentTab.description}</p>
              </div>

              {/* 폼 필드 */}
              <div className="flex w-full flex-col gap-4">
                {/* 계정 필드 */}
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

                {/* 비밀번호 필드 */}
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
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>

                {/* 체크박스 + 비밀번호 찾기 */}
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
                        rememberMe
                          ? 'border-primary-700 bg-primary-700'
                          : 'border-border-default bg-white'
                      }`}
                    >
                      {rememberMe && (
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
                      )}
                    </span>
                    <span className="text-body3 text-text-secondary">로그인 정보 저장</span>
                  </label>
                  <Button type="button" variant="link">
                    비밀번호를 잊으셨나요?
                  </Button>
                </div>
              </div>

              {loginError && <p className="text-body3 text-destructive">{loginError}</p>}

              {/* 로그인 버튼 */}
              <Button type="submit" size="md" disabled={!isFormValid || isSubmitting}>
                {isSubmitting ? '로그인 중...' : '로그인하기'}
              </Button>
            </form>

            {/* 하단: 회원가입 */}
            <div className="border-primary-100 flex justify-center border-t pt-6">
              {activeTab === 'individual' ? (
                <div className="flex items-center gap-3">
                  <span className="text-body2 text-text-tertiary">아직 회원이 아니신가요?</span>
                  <Link
                    href={`/signup/${getFirstStep()}`}
                    className="text-body2 text-text-primary hover:underline"
                  >
                    회원가입하기
                  </Link>
                </div>
              ) : (
                <span className="text-body2 text-text-tertiary">
                  기업 계정 발급은 관리자에게 문의해주세요.
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
