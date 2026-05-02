'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/common/header';
import { getFirstStep } from '@/lib/signup-flow';

const TAB_CONTENT = {
  corporate: {
    description: '가장 적합한 지원자를 빠르고 정확하게 확인해보세요.',
    emailPlaceholder: 'example@gmail.co.kr',
  },
  individual: {
    description: '나에게 가장 알맞는 공고를 확인해보세요.',
    emailPlaceholder: 'personal@gmail.com',
  },
} as const;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'corporate' | 'individual'>('corporate');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const currentTab = TAB_CONTENT[activeTab];

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div className="bg-bg-secondary min-h-screen">
      <Header />

      {/* 메인 콘텐츠 */}
      <main className="flex justify-center pt-[113px] pb-20">
        <div className="border-border-light bg-bg-primary w-[628px] rounded-[20px] border px-16 py-11">
          <div className="flex w-[500px] flex-col gap-6">
            {/* 상단 섹션 */}
            <div className="flex flex-col items-center gap-[34px]">
              {/* 탭 바 */}
              <div className="bg-primary-100 flex w-full items-center gap-1.5 rounded-full p-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('corporate')}
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
                  onClick={() => setActiveTab('individual')}
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
                {/* 이메일 필드 */}
                <div className="flex flex-col gap-2">
                  <label className="text-body1 text-text-primary">이메일</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={currentTab.emailPlaceholder}
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
                  <Button variant="link">비밀번호를 잊으셨나요?</Button>
                </div>
              </div>

              {/* 로그인 버튼 */}
              <Button type="submit" size="md" disabled={!isFormValid}>
                로그인하기
              </Button>
            </div>

            {/* 하단: 회원가입 */}
            <div className="border-primary-100 flex justify-center border-t pt-6">
              <div className="flex items-center gap-3">
                <span className="text-body2 text-text-tertiary">아직 회원이 아니신가요?</span>
                <Link
                  href={`/signup/${activeTab}/${getFirstStep(activeTab)}`}
                  className="text-body2 text-text-primary hover:underline"
                >
                  회원가입하기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
