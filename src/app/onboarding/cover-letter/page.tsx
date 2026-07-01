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
import { getEssayAnswers, postEssayAnswers, putEssayAnswers } from '@/lib/onboarding-api';
import { coverLetterSchema, type CoverLetterData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { CoverLetterQuestionField } from './_components/cover-letter-question-field';
import { COVER_LETTER_QUESTIONS } from './_constants/cover-letter-questions';

const CURRENT_STEP = 'cover-letter' as const;
const FALLBACK_QUESTION_IDS = [1, 2, 3];

export default function CoverLetterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const essayCompletedRef = useRef(false);
  const answerIdsRef = useRef<number[]>([]);
  const questionIdsRef = useRef<number[]>([]);

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
        const essayRes = await getEssayAnswers();
        const answers = essayRes.data.answers;

        if (answers && answers.length > 0) {
          const sorted = [...answers].sort((a, b) => a.sequence - b.sequence);

          if (sorted[0]) setValue('question1', sorted[0].answer);
          if (sorted[1]) setValue('question2', sorted[1].answer);
          if (sorted[2]) setValue('question3', sorted[2].answer);

          answerIdsRef.current = sorted.map((a) => a.answerId);
          questionIdsRef.current = sorted.map((a) => a.questionId);
          essayCompletedRef.current = true;
        } else {
          essayCompletedRef.current = false;
          questionIdsRef.current = [];
        }
      } catch {
        // GET 실패 시 조용히 처리 — 빈 폼으로 POST 경로 진행 (AC7)
        essayCompletedRef.current = false;
        questionIdsRef.current = [];
      } finally {
        setIsLoading(false);
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

    const fields = [data.question1, data.question2, data.question3];

    try {
      // answerIds가 없으면 PUT 대신 POST로 안전하게 전환
      if (essayCompletedRef.current && answerIdsRef.current.length === 0) {
        essayCompletedRef.current = false;
      }

      if (essayCompletedRef.current) {
        // AC4: PUT — 전체 덮어쓰기
        const answers = answerIdsRef.current.map((answerId, i) => ({
          answerId,
          answer: fields[i] ?? '',
        }));
        await putEssayAnswers(answers);
      } else {
        // AC3: POST — 최초 저장
        const qIds =
          questionIdsRef.current.length > 0
            ? questionIdsRef.current
            : FALLBACK_QUESTION_IDS;
        const answers = fields.map((answer, i) => ({
          questionId: qIds[i] ?? FALLBACK_QUESTION_IDS[i],
          answer: answer ?? '',
        }));
        await postEssayAnswers(answers);
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
            <div
              role="alert"
              aria-live="assertive"
              className="bg-error/10 border-error text-error rounded-lg border px-4 py-3 text-sm"
            >
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft size={20} />
              이전 단계
            </Button>

            <div className="flex items-center gap-3.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleSkip}
                disabled={isLoading || isSubmitting}
                className="border-error text-error hover:bg-error/5"
              >
                나중에 작성
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={isLoading || !isValid || isSubmitting}
                aria-busy={isSubmitting}
                aria-disabled={isLoading || !isValid || isSubmitting}
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
