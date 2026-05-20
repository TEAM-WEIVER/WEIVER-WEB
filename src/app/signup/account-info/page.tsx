'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { initApplicantSignup } from '@/lib/signup-api';
import { getNextStep, getStepNumber } from '@/lib/signup-flow';
import { individualAccountSchema, type IndividualAccountData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

import { EmailVerificationSection } from './_components/email-verification-section';
import { PasswordFieldsSection } from './_components/password-fields-section';
import { useEmailVerification } from './_hooks/use-email-verification';

export default function SignupAccountInfoPage() {
  const router = useRouter();
  const savedAccount = useSignupStore((state) => state.account);
  const setAccount = useSignupStore((state) => state.setAccount);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IndividualAccountData>({
    resolver: zodResolver(individualAccountSchema),
    defaultValues: {
      email: savedAccount.email,
      password: '',
      passwordConfirm: '',
    },
    mode: 'onChange',
  });

  const watchedEmail = useWatch({ control, name: 'email' }) ?? '';
  const watchedPassword = useWatch({ control, name: 'password' }) ?? '';
  const verification = useEmailVerification(watchedEmail);

  const stepNumber = getStepNumber('account-info');
  const nextStep = getNextStep('account-info');
  const canSubmit = isValid && verification.isEmailVerified;

  const onSubmit = async (data: IndividualAccountData) => {
    if (!verification.isEmailVerified) return;

    setSubmitError(null);

    try {
      const response = await initApplicantSignup({
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        verificationToken: verification.verificationToken,
      });

      setAccount({ email: data.email, signupToken: response.data.signupToken });
      if (nextStep) router.push(`/signup/${nextStep}`);
    } catch {
      setSubmitError('회원가입 계정 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-[500px] flex-col gap-[34px]"
    >
      <div className="flex flex-col gap-[34px]">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">계정을 생성하세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 계정 정보를 입력해주세요.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <EmailVerificationSection
            emailInputProps={register('email')}
            emailError={errors.email?.message}
            watchedEmail={watchedEmail}
            verification={verification}
          />

          <PasswordFieldsSection register={register} errors={errors} password={watchedPassword} />
        </div>
      </div>

      <Button type="submit" size="md" disabled={!canSubmit || isSubmitting} className="w-full">
        {isSubmitting ? '처리 중' : '다음 단계'}
        <ArrowRight size={20} />
      </Button>
      {submitError ? <p className="text-caption text-error text-right">{submitError}</p> : null}
    </form>
  );
}
