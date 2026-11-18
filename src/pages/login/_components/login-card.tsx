import type { ComponentProps } from 'react';

import { AuthCard } from '@/components/common/auth-card';

import { KakaoLogin } from './kakao-login';
import { LoginFooter } from './login-footer';
import { LoginForm } from './login-form';

export function LoginCard(props: ComponentProps<typeof LoginForm>) {
  return (
    <AuthCard
      title="WEIVER 로그인"
      description="로그인하고 나만의 전형 준비를 시작해보세요."
      hideTitle
    >
      <LoginForm {...props} />
      <KakaoLogin />
      <LoginFooter />
    </AuthCard>
  );
}
