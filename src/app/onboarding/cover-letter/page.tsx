'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getNextOnboardingStep,
  getPrevOnboardingStep,
  getOnboardingPath,
} from '@/lib/onboarding-flow';
import { coverLetterSchema, type CoverLetterData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { CoverLetterQuestionField } from './_components/cover-letter-question-field';
import { COVER_LETTER_QUESTIONS } from './_constants/cover-letter-questions';

const CURRENT_STEP = 'cover-letter' as const;

export default function CoverLetterPage() {
  const router = useRouter();

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);
  const prevStep = getPrevOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<CoverLetterData>({
    resolver: zodResolver(coverLetterSchema),
    defaultValues: {
      question1: '',
      question2: '',
      question3: '',
    },
    mode: 'onChange',
  });

  const questionValues =
    useWatch({
      control,
      name: COVER_LETTER_QUESTIONS.map((question) => question.field),
    }) ?? [];

  const navigateNext = () => {
    if (nextStep) router.push(getOnboardingPath(nextStep));
  };

  const onSubmit = (data: CoverLetterData) => {
    // TODO: API 연동
    console.log(data);
    navigateNext();
  };

  const handleSkip = () => {
    navigateNext();
  };

  const handleBack = () => {
    if (prevStep) router.push(getOnboardingPath(prevStep));
  };

  return (
    <OnboardingStepShell
      totalSteps={TOTAL_STEPS}
      currentStep={stepNumber}
      title={stepTitle}
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="xs" onClick={handleBack}>
            <ArrowLeft size={20} />
            이전 단계
          </Button>

          <div className="flex items-center gap-3.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleSkip}
              className="border-error text-error hover:bg-error/5"
            >
              나중에 작성
            </Button>
            <Button type="submit" size="xs" disabled={!isValid}>
              다음
              <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      }
    >
      <div className="bg-bg-tertiary rounded-lg px-5 py-3">
        <p className="text-body2 text-text-tertiary">
          문항에 알맞는 내용으로 자기소개서를 작성해주세요. 모든 기업은 공통적인 자기소개서 문항을
          사용합니다.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {COVER_LETTER_QUESTIONS.map((question, index) => (
          <CoverLetterQuestionField
            key={question.number}
            question={question}
            currentLength={questionValues[index]?.length ?? 0}
            register={register}
          />
        ))}
      </div>
    </OnboardingStepShell>
  );
}
