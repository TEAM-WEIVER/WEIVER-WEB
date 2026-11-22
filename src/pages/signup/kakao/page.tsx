import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AuthCard } from '@/components/common/auth-card';
import { SignupAgreementsForm } from '@/pages/signup/_components/signup-agreements-form';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH, MEMBER_HOME_PATH } from '@/lib/auth-paths';
import { completeKakaoSignup } from '@/lib/kakao-auth-api';
import {
  applyKakaoSession,
  clearKakaoSignup,
  consumeKakaoSignup,
  getKakaoErrorMessage,
  getKakaoSignup,
} from '@/lib/kakao-auth-flow';

import { EmailVerificationSection } from '../account-info/_components/email-verification-section';
import { useEmailVerification } from '../account-info/_hooks/use-email-verification';

const emailSchema = z.object({ email: z.string().email('올바른 이메일 형식을 입력해주세요.') });

function KakaoEmailVerification({
  onVerified,
}: {
  onVerified: (verification: { email: string; verificationToken: string }) => void;
}) {
  const { register, control, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });
  const email = useWatch({ control, name: 'email' });
  const verification = useEmailVerification(email);

  return (
    <AuthCard title="이메일 인증" description="카카오 가입에 사용할 이메일을 인증해주세요.">
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={handleSubmit(({ email: verifiedEmail }) => {
          if (verification.isEmailVerified && verification.verificationToken) {
            onVerified({ email: verifiedEmail, verificationToken: verification.verificationToken });
          }
        })}
      >
        <EmailVerificationSection
          emailInputProps={register('email')}
          emailError={formState.errors.email?.message}
          watchedEmail={email}
          verification={verification}
        />
        <Button
          type="submit"
          disabled={
            !formState.isValid || !verification.isEmailVerified || !verification.verificationToken
          }
        >
          약관 동의로 계속
        </Button>
        <Link
          to={LOGIN_PATH}
          replace
          onClick={clearKakaoSignup}
          className="text-body3 text-text-secondary text-center underline"
        >
          로그인으로 돌아가기
        </Link>
      </form>
    </AuthCard>
  );
}

export default function KakaoSignupPage() {
  const navigate = useNavigate();
  const [signup] = useState(getKakaoSignup);
  const [emailVerification, setEmailVerification] = useState<{
    email: string;
    verificationToken: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const mounted = useRef(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const timeout = signup
      ? window.setTimeout(
          () => {
            if (submitted.current) return;
            clearKakaoSignup();
            setExpired(true);
          },
          Math.max(0, signup.expiresAt - Date.now()),
        )
      : undefined;
    return () => {
      mounted.current = false;
      window.clearTimeout(timeout);
    };
  }, [signup]);

  if (!signup || expired || error) {
    return (
      <AuthCard title="카카오 가입 다시 시작" description="카카오 인증을 다시 진행해주세요.">
        <p role="alert" className="text-body2 text-text-secondary mb-5">
          {error ?? '가입 정보가 없거나 만료되었습니다. 로그인 화면에서 다시 시작해주세요.'}
        </p>
        <Button asChild className="w-full">
          <Link to={LOGIN_PATH} replace>
            로그인으로 돌아가기
          </Link>
        </Button>
      </AuthCard>
    );
  }

  if (!signup.verifiedEmail && !emailVerification) {
    return <KakaoEmailVerification onVerified={setEmailVerification} />;
  }

  return (
    <main className="bg-bg-secondary min-h-screen px-4 py-8 sm:py-[74px]">
      <SignupAgreementsForm
        description="카카오 가입을 완료하려면 필수 약관에 동의해주세요."
        backLabel="로그인으로 돌아가기"
        onBack={() => {
          clearKakaoSignup();
          navigate(LOGIN_PATH, { replace: true });
        }}
        onComplete={async (terms) => {
          if (submitted.current) return;
          submitted.current = true;
          try {
            const { signupToken } = consumeKakaoSignup(signup.signupToken);
            const session = await completeKakaoSignup(
              signupToken,
              terms,
              signup.verifiedEmail ? undefined : (emailVerification ?? undefined),
            );
            if (!mounted.current) return;
            applyKakaoSession(session);
            navigate(MEMBER_HOME_PATH, { replace: true });
          } catch (cause) {
            if (!mounted.current) return;
            clearKakaoSignup();
            setError(getKakaoErrorMessage(cause));
          }
        }}
      />
    </main>
  );
}
