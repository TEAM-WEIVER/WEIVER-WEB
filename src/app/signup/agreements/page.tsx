'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { setAuthSession } from '@/lib/auth-token';
import { completeSignup } from '@/lib/signup-api';
import { getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { INDIVIDUAL_TERMS } from '@/lib/signup-terms';
import { individualTermsSchema, type IndividualTermsData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

import { TermSection } from './_components/term-section';

export default function SignupAgreementsPage() {
  const router = useRouter();
  const account = useSignupStore((state) => state.account);
  const savedTerms = useSignupStore((state) => state.terms);
  const reset = useSignupStore((state) => state.reset);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSignupCompleted, setIsSignupCompleted] = useState(false);

  const defaultValues = Object.fromEntries(
    INDIVIDUAL_TERMS.map((item) => [item.key, savedTerms[item.key] ?? false]),
  );

  const {
    setValue,
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<IndividualTermsData>({
    resolver: zodResolver(individualTermsSchema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedValues =
    useWatch({
      control,
      name: INDIVIDUAL_TERMS.map((item) => item.key),
    }) ?? [];

  // AC11: signupToken 없으면 즉시 리다이렉트 (플리커 방지 early return — Hook 이후에 위치)
  useEffect(() => {
    if (isSignupCompleted) return;

    if (!account.signupToken) {
      router.replace('/signup/account-info');
    }
  }, [account.signupToken, isSignupCompleted, router]);

  if (!account.signupToken) return null;

  const watchedTerms = Object.fromEntries(
    INDIVIDUAL_TERMS.map((item, index) => [item.key, Boolean(watchedValues[index])]),
  );
  const allChecked = INDIVIDUAL_TERMS.filter((item) => item.required).every(
    (item) => watchedTerms[item.key],
  );
  const stepNumber = getStepNumber('agreements');
  const prevStep = getPrevStep('agreements');

  const handleToggleAll = () => {
    const next = !allChecked;
    INDIVIDUAL_TERMS.forEach((item) => {
      setValue(item.key, next, {
        shouldValidate: true,
      });
    });
  };

  const handleToggle = (key: keyof IndividualTermsData) => {
    const current = watchedTerms[key];
    setValue(key, !current, {
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: IndividualTermsData) => {
    setSubmitError(null);

    try {
      const response = await completeSignup({
        account,
        terms: data,
      });
      setAuthSession(response.data.accessToken, response.data.role);
      setIsSignupCompleted(true);
      reset();
      router.push('/onboarding/resume');
    } catch {
      setSubmitError('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleBack = () => {
    router.push(prevStep ? `/signup/${prevStep}` : '/login');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-11">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">약관에 동의해주세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 정보 수집 및 이용에 대한 약관에 동의해주세요.
          </p>
        </div>

        <div className="bg-bg-tertiary flex flex-col gap-2 rounded-lg px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Checkbox checked={allChecked} onCheckedChange={handleToggleAll} />
            <span className="text-body2 text-text-secondary font-medium">모두 동의합니다.</span>
          </div>
          <p className="text-body3 text-text-tertiary pl-8">
            서비스 이용약관, 개인정보 처리방침, 개인회원 이용약관, 마케팅 정보 수신 동의에 대해 모두
            동의합니다.
            <br />각 사항에 대한 동의 여부를 개별적으로 선택할 수 있으며, 선택 동의 사항에 대한
            동의를 거부하여도 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        {INDIVIDUAL_TERMS.map((item) => (
          <TermSection
            key={item.key}
            item={item}
            checked={!!watchedTerms[item.key]}
            onToggle={() => handleToggle(item.key)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleBack}
          className="border-border-default gap-1"
        >
          <ArrowLeft size={16} />
          이전 단계
        </Button>
        <Button type="submit" size="xs" disabled={!isValid || isSubmitting}>
          {isSubmitting ? '처리 중' : '다음 단계'}
        </Button>
      </div>
      {submitError ? <p className="text-caption text-error text-right">{submitError}</p> : null}
    </form>
  );
}
