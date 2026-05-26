import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginApplicant, loginCompany } from '@/lib/login-api';

import type { LoginTab } from '../_components/login-tabs';

export const TAB_CONTENT = {
  corporate: {
    description: '가장 적합한 지원자를 빠르고 정확하게 확인해보세요.',
    accountLabel: '아이디',
    accountErrorLabel: '아이디와',
    accountPlaceholder: 'weiver',
    accountAutoComplete: 'username',
  },
  individual: {
    description: '나에게 가장 알맞는 공고를 확인해보세요.',
    accountLabel: '이메일',
    accountErrorLabel: '이메일과',
    accountPlaceholder: 'personal@gmail.com',
    accountAutoComplete: 'email',
  },
} as const;

export function useLoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LoginTab>('corporate');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTab = TAB_CONTENT[activeTab];
  const trimmedAccountId = accountId.trim();
  const isFormValid = trimmedAccountId !== '' && password.trim() !== '';

  const handleTabChange = (tab: LoginTab) => {
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

      await loginApplicant({
        email: trimmedAccountId,
        password,
      });
      router.push('/applicant/dashboard');
    } catch {
      setLoginError(
        `로그인에 실패했습니다. ${currentTab.accountErrorLabel} 비밀번호를 다시 확인해주세요.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}

export type UseLoginFormReturn = ReturnType<typeof useLoginForm>;
