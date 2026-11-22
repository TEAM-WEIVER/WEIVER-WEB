import type { ComponentProps } from 'react';

import { AuthCard } from '@/components/common/auth-card';

import { KakaoLogin } from './kakao-login';
import { LoginFooter } from './login-footer';
import { LoginForm } from './login-form';

export function LoginCard({
  kakao,
  ...props
}: ComponentProps<typeof LoginForm> & { kakao: ComponentProps<typeof KakaoLogin> }) {
  return (
    <AuthCard
      title="WEIVER 로그인"
      description="로그인하고 나만의 전형 준비를 시작해보세요."
      hideTitle
    >
      <fieldset disabled={kakao.isStarting} className="min-w-0">
        <legend className="sr-only">이메일 로그인</legend>
        <LoginForm {...props} />
      </fieldset>
      <KakaoLogin {...kakao} disabled={props.isSubmitting} />
      <LoginFooter />
    </AuthCard>
  );
}
