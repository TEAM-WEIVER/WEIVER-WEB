'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getNextOnboardingStep,
  getPrevOnboardingStep,
  getOnboardingPath,
} from '@/lib/onboarding-flow';
import {
  getEssayAnswer,
  postEssayAnswer,
  patchEssayAnswer,
} from '@/lib/onboarding-api';
import { coverLetterSchema, type CoverLetterData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { CoverLetterQuestionField } from './_components/cover-letter-question-field';
import { COVER_LETTER_QUESTIONS } from './_constants/cover-letter-questions';

const CURRENT_STEP = 'cover-letter' as const;

export default function CoverLetterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const essayCompletedRef = useRef(false);
  const answerIdRef = useRef<string | null>(null);

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);
  const prevStep = getPrevOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  useEffect(() => {
    async function loadEssayAnswer() {
      try {
        const essayRes = await getEssayAnswer();
        if (essayRes.data.answer) {
          const lines = essayRes.data.answer.split('\n\n---\n\n');
          if (lines[0]) setValue('question1', lines[0]);
          if (lines[1]) setValue('question2', lines[1]);
          if (lines[2]) setValue('question3', lines[2]);
        }
        if (essayRes.data.answerId) {
          essayCompletedRef.current = true;
          answerIdRef.current = essayRes.data.answerId;
        }
      } catch {
        // 로드 실패 시 빈 폼으로 진행 (신규 입력)
      }
    }

    loadEssayAnswer();
  }, [setValue]);

  const navigateNext = () => {
    if (nextStep) router.push(getOnboardingPath(nextStep));
  };

  const onSubmit = async (data: CoverLetterData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const answer = [data.question1, data.question2, data.question3].join('\n\n---\n\n');

    try {
      if (essayCompletedRef.current && answerIdRef.current) {
        await patchEssayAnswer(answerIdRef.current, answer);
      } else {
        await postEssayAnswer(answer);
      }
      navigateNext();
    } catch {
      setSubmitError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="flex flex-col gap-3">
          {submitError && (
            <div role="alert" aria-live="assertive" className="bg-error/10 border-error text-error rounded-lg border px-4 py-3 text-sm">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="xs" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft size={20} />
              이전 단계
            </Button>

            <div className="flex items-center gap-3.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="border-error text-error hover:bg-error/5"
              >
                나중에 작성
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={!isValid || isSubmitting}
                aria-busy={isSubmitting}
                aria-disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    저장 중
                  </>
                ) : (
                  <>
                    다음
                    <ArrowRight size={20} />
                  </>
                )}
              </Button>
            </div>
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
