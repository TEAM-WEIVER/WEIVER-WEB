'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LOGIN_PATH } from '@/lib/auth-paths';
import { clearAccessToken } from '@/lib/auth-token';
import { completeSignup } from '@/lib/signup-api';
import { getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { INDIVIDUAL_TERMS } from '@/lib/signup-terms';
import { individualTermsSchema, type IndividualTermsData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

import { TermSection } from './_components/term-section';

const termKeys = INDIVIDUAL_TERMS.map((item) => item.key);

export default function SignupAgreementsPage() {
  const navigate = useNavigate();
  const account = useSignupStore((state) => state.account);
  const savedTerms = useSignupStore((state) => state.terms);
  const reset = useSignupStore((state) => state.reset);
  const submitting = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSignupCompleted, setIsSignupCompleted] = useState(false);

  const {
    setValue,
    trigger,
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<IndividualTermsData>({
    resolver: zodResolver(individualTermsSchema),
    defaultValues: Object.fromEntries(termKeys.map((key) => [key, savedTerms[key] ?? false])),
    mode: 'onChange',
  });

  const watchedValues = useWatch({ control, name: termKeys });

  useEffect(() => {
    if (!account.signupToken && !isSignupCompleted) {
      navigate('/signup/account-info', { replace: true });
    }
  }, [account.signupToken, isSignupCompleted, navigate]);

  if (!account.signupToken) return null;

  const allChecked = watchedValues.every(Boolean);
  const someChecked = watchedValues.some(Boolean);
  const stepNumber = getStepNumber('agreements');
  const prevStep = getPrevStep('agreements');

  const handleToggleAll = (next: boolean | 'indeterminate') => {
    termKeys.forEach((key) => setValue(key, next === true));
    void trigger();
  };

  const submit = handleSubmit(async (data) => {
    setSubmitError(null);

    try {
      await completeSignup({ account, terms: data });
      clearAccessToken();
      setIsSignupCompleted(true);
      reset();
      navigate(LOGIN_PATH, { replace: true });
    } catch {
      setSubmitError('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  });

  return (
    <form
      aria-labelledby="signup-agreements-title"
      aria-busy={isSubmitting}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;

        submitting.current = true;
        void submit(event).finally(() => {
          submitting.current = false;
        });
      }}
      className="bg-bg-primary mx-auto flex w-full max-w-[1062px] flex-col gap-9 rounded-[20px] p-5 sm:p-11"
    >
      <header className="flex flex-col gap-1.5">
        <h1 id="signup-agreements-title" className="text-h2 text-text-secondary">
          약관에 동의해주세요
        </h1>
        <p className="text-body2 text-text-tertiary">
          {stepNumber}단계 · 정보 수집 및 이용에 대한 약관에 동의해주세요.
        </p>
      </header>

      <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-8">
        <legend className="sr-only">가입 약관</legend>
        <div className="bg-bg-tertiary flex flex-col gap-2 rounded-lg px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="all-agreements"
              checked={allChecked || (someChecked ? 'indeterminate' : false)}
              onCheckedChange={handleToggleAll}
              aria-describedby="all-agreements-description"
            />
            <Label
              htmlFor="all-agreements"
              className="text-text-secondary cursor-pointer text-sm leading-5"
            >
              모두 동의합니다.
            </Label>
          </div>
          <p id="all-agreements-description" className="text-body3 text-primary-600">
            필수 약관과 선택 약관에 모두 동의합니다.
            <br />각 약관은 개별로 선택할 수 있으며, 선택 약관에 동의하지 않아도 서비스를 이용할 수
            있습니다.
          </p>
        </div>

        {INDIVIDUAL_TERMS.map((item, index) => (
          <TermSection
            key={item.key}
            item={item}
            checked={Boolean(watchedValues[index])}
            onToggle={(checked) => setValue(item.key, checked, { shouldValidate: true })}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={isSubmitting}
          onClick={() => navigate(prevStep ? `/signup/${prevStep}` : LOGIN_PATH)}
          className="border-border-default text-sm font-medium shadow-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          이전 단계
        </Button>
        <Button
          type="submit"
          size="xs"
          disabled={!isValid || isSubmitting}
          className="text-sm font-medium"
        >
          {isSubmitting ? '처리 중' : '회원가입 완료'}
        </Button>
      </div>
      {submitError ? (
        <p role="alert" className="text-caption text-error">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}
