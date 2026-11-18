import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { AuthCard } from '@/components/common/auth-card';
import { LOGIN_PATH } from '@/lib/auth-paths';
import { toast } from '@/store/toast-store';

import { EmailVerificationForm } from './_components/email-verification-form';
import { NewPasswordForm } from './_components/new-password-form';

type ResetStep =
  | { kind: 'verify'; email?: string; notice?: string }
  | { kind: 'reset'; email: string; verificationToken: string };

export default function PasswordResetPage() {
  const [step, setStep] = useState<ResetStep>({ kind: 'verify' });
  const navigate = useNavigate();

  return (
    <AuthCard
      title="비밀번호 재설정"
      description={
        step.kind === 'verify'
          ? '이메일을 인증하고 비밀번호를 재설정해주세요.'
          : '새 비밀번호를 입력해주세요.'
      }
    >
      {step.kind === 'verify' ? (
        <EmailVerificationForm
          initialEmail={step.email}
          notice={step.notice}
          onVerified={(email, verificationToken) =>
            setStep({ kind: 'reset', email, verificationToken })
          }
        />
      ) : (
        <NewPasswordForm
          email={step.email}
          verificationToken={step.verificationToken}
          onRestart={(notice) => setStep({ kind: 'verify', email: step.email, notice })}
          onSuccess={() => {
            toast.add({ type: 'success', title: '비밀번호를 변경했습니다. 다시 로그인해주세요.' });
            navigate(LOGIN_PATH, { replace: true });
          }}
        />
      )}
      <p className="text-caption text-text-secondary mt-8 text-center">
        <Link
          to={LOGIN_PATH}
          className="focus-visible:outline-primary-600 rounded-sm underline underline-offset-2 focus-visible:outline-2"
        >
          로그인으로 돌아가기
        </Link>
      </p>
    </AuthCard>
  );
}
