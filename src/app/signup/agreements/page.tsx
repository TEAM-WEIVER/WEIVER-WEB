'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { completeSignup } from '@/lib/signup-api';
import { getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { INDIVIDUAL_TERMS } from '@/lib/signup-terms';
import { individualTermsSchema, type IndividualTermsData } from '@/schemas/signup';
import { useSignupStore } from '@/store/signup-store';

import { TermSection } from './_components/term-section';

export default function SignupAgreementsPage() {
  const router = useRouter();
  const setTerms = useSignupStore((state) => state.setTerms);
  const savedTerms = useSignupStore((state) => state.terms);
  const account = useSignupStore((state) => state.account);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      name: INDIVIDUAL_TERMS.map((item) => item.key) as Array<keyof IndividualTermsData>,
    }) ?? [];

  const watchedTerms = Object.fromEntries(
    INDIVIDUAL_TERMS.map((item, index) => [item.key, Boolean(watchedValues[index])]),
  );
  const allChecked = INDIVIDUAL_TERMS.every((item) => watchedTerms[item.key]);
  const stepNumber = getStepNumber('agreements');
  const prevStep = getPrevStep('agreements');

  const handleToggleAll = () => {
    const next = !allChecked;
    INDIVIDUAL_TERMS.forEach((item) => {
      setValue(item.key as keyof IndividualTermsData, next, {
        shouldValidate: true,
      });
    });
  };

  const handleToggle = (key: string) => {
    const current = watchedTerms[key];
    setValue(key as keyof IndividualTermsData, !current, {
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: IndividualTermsData) => {
    setSubmitError(null);

    if (!account.email.trim() || !account.signupToken) {
      setSubmitError('계정 정보가 없습니다. 계정 입력 단계부터 다시 진행해주세요.');
      return;
    }

    try {
      await completeSignup({
        account,
        terms: data,
      });
      setTerms(data);
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
