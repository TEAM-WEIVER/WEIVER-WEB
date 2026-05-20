'use client';

import { useRouter } from 'next/navigation';
import { type UseFormRegister, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formTextareaClass } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { FormStepHeader } from '@/components/common/form-step-header';
import {
  TOTAL_STEPS,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getNextOnboardingStep,
  getPrevOnboardingStep,
  getOnboardingPath,
} from '@/lib/onboarding-flow';
import { coverLetterSchema, type CoverLetterData } from '@/schemas/onboarding';

const CURRENT_STEP = 'cover-letter' as const;

const QUESTIONS = [
  {
    number: 1,
    text: '원하는 분야에 관심을 갖게 된 계기와 자신 있는 이유(그동안의 노력, 경험, 강점 포함) 등에 대해 구체적으로 설명해주세요.',
    maxLength: 1000,
    field: 'question1' as const,
  },
  {
    number: 2,
    text: '가장 열정을 가지고 임했던 프로젝트(목표/과제 등)를 소개해주시고, 해당 프로젝트의 수행 과정 및 결과에 대해 기재해주세요.',
    maxLength: 1000,
    field: 'question2' as const,
  },
  {
    number: 3,
    text: '입사 후 회사에서 이루고 싶은 꿈을 적어주세요.',
    maxLength: 500,
    field: 'question3' as const,
  },
];

interface CoverLetterQuestionFieldProps {
  question: (typeof QUESTIONS)[number];
  currentLength: number;
  register: UseFormRegister<CoverLetterData>;
}

function CoverLetterQuestionField({
  question,
  currentLength,
  register,
}: CoverLetterQuestionFieldProps) {
  const isOverLimit = currentLength > question.maxLength;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <p className="text-body1 text-text-secondary">
          {question.number}. {question.text}
        </p>
        <p
          className={`text-caption shrink-0 pl-4 text-right ${
            isOverLimit ? 'text-error' : 'text-text-tertiary'
          }`}
        >
          {currentLength}/{question.maxLength}
        </p>
      </div>
      <Textarea
        {...register(question.field)}
        placeholder="내용을 입력해주세요."
        className={`${formTextareaClass} min-h-[180px] resize-none ${
          isOverLimit ? 'border-error focus-visible:border-error focus-visible:ring-error/20' : ''
        }`}
      />
    </div>
  );
}

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
      name: QUESTIONS.map((question) => question.field),
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
    <div>
      <FormStepHeader totalSteps={TOTAL_STEPS} currentStep={stepNumber} title={stepTitle} />

      <div className="border-border-light bg-bg-primary rounded-b-[20px] border p-11">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-11">
          <div className="flex flex-col gap-[34px]">
            {/* 안내 문구 */}
            <div className="bg-bg-tertiary rounded-lg px-5 py-3">
              <p className="text-body2 text-text-tertiary">
                문항에 알맞는 내용으로 자기소개서를 작성해주세요. 모든 기업은 공통적인 자기소개서
                문항을 사용합니다.
              </p>
            </div>

            {/* 문항 목록 */}
            <div className="flex flex-col gap-6">
              {QUESTIONS.map((question, index) => (
                <CoverLetterQuestionField
                  key={question.number}
                  question={question}
                  currentLength={questionValues[index]?.length ?? 0}
                  register={register}
                />
              ))}
            </div>
          </div>

          {/* 하단 버튼 */}
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
        </form>
      </div>
    </div>
  );
}
