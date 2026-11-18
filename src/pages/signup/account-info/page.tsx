'use client';

import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LOGIN_PATH } from '@/lib/auth-paths';
import { initApplicantSignup } from '@/lib/signup-api';
import { getNextStep } from '@/lib/signup-flow';
import { individualAccountSchema, type IndividualAccountData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

import { EmailVerificationSection } from './_components/email-verification-section';
import { PasswordFieldsSection } from './_components/password-fields-section';
import { useEmailVerification } from './_hooks/use-email-verification';

export default function SignupAccountInfoPage() {
  const navigate = useNavigate();
  const savedEmail = useSignupStore((state) => state.account.email);
  const setAccount = useSignupStore((state) => state.setAccount);
  const submitting = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IndividualAccountData>({
    resolver: zodResolver(individualAccountSchema),
    defaultValues: {
      email: savedEmail,
      password: '',
      passwordConfirm: '',
    },
    mode: 'onChange',
  });

  const watchedEmail = useWatch({ control, name: 'email' });
  const watchedPassword = useWatch({ control, name: 'password' });
  const verification = useEmailVerification(watchedEmail);
  const canSubmit = isValid && verification.isEmailVerified;

  const submit = handleSubmit(async (data) => {
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
      const nextStep = getNextStep('account-info');
      if (nextStep) navigate(`/signup/${nextStep}`);
    } catch {
      setSubmitError('회원가입 계정 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  });

  return (
    <section
      aria-labelledby="signup-account-title"
      className="bg-bg-primary mx-auto w-full max-w-[420px] rounded-[20px] px-5 pt-10 pb-8 sm:px-10 sm:pt-[74px] sm:pb-12"
    >
      <header className="mb-7 text-center sm:mb-8">
        <img src="/weiver.svg" alt="위버" width={72} height={18} className="mx-auto mb-6" />
        <h1 id="signup-account-title" className="text-h2 text-text-secondary">
          계정을 생성해주세요.
        </h1>
        <p className="text-body2 text-text-tertiary mt-1.5">
          이메일과 비밀번호로 계정을 만들어주세요.
        </p>
      </header>

      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={(event) => {
          event.preventDefault();
          if (submitting.current) return;

          submitting.current = true;
          void submit(event).finally(() => {
            submitting.current = false;
          });
        }}
        className="flex flex-col gap-5"
      >
        <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">계정 정보</legend>
          <EmailVerificationSection
            emailInputProps={register('email')}
            emailError={errors.email?.message}
            watchedEmail={watchedEmail}
            verification={verification}
          />

          <PasswordFieldsSection register={register} errors={errors} password={watchedPassword} />
        </fieldset>

        <Button
          type="submit"
          size="md"
          disabled={!canSubmit || isSubmitting}
          className="w-full text-sm font-medium"
        >
          {isSubmitting ? '처리 중' : '다음 단계'}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
        {submitError ? (
          <p role="alert" className="text-caption text-error">
            {submitError}
          </p>
        ) : null}
      </form>

      <p className="text-body3 text-text-tertiary border-border-light mt-5 border-t pt-5 text-center">
        이미 계정이 있으신가요?{' '}
        <Link to={LOGIN_PATH} className="text-text-secondary underline underline-offset-2">
          로그인
        </Link>
      </p>
    </section>
  );
}
