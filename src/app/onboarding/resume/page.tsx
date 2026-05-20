'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';

import { FormStepHeader } from '@/components/common/form-step-header';
import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getNextOnboardingStep,
  getOnboardingPath,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
} from '@/lib/onboarding-flow';
import { resumeSchema, type ResumeData } from '@/schemas/onboarding';

import { AwardSection, EMPTY_AWARD } from './_components/award-section';
import { CareerSection, EMPTY_CAREER } from './_components/career-section';
import { CertificationSection, EMPTY_CERTIFICATION } from './_components/certification-section';
import { EducationSection, EMPTY_EDUCATION } from './_components/education-section';
import { PersonalInfoSection } from './_components/personal-info-section';

const CURRENT_STEP = 'resume' as const;

export default function ResumePage() {
  const router = useRouter();

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const nextStep = getNextOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<ResumeData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      education: [{ ...EMPTY_EDUCATION }],
      certifications: [{ ...EMPTY_CERTIFICATION }],
      awards: [{ ...EMPTY_AWARD }],
      careers: [{ ...EMPTY_CAREER }],
    },
    mode: 'onChange',
  });

  const education = useFieldArray({ control, name: 'education' });
  const certifications = useFieldArray({ control, name: 'certifications' });
  const awards = useFieldArray({ control, name: 'awards' });
  const careers = useFieldArray({ control, name: 'careers' });

  const navigateNext = () => {
    if (nextStep) router.push(getOnboardingPath(nextStep));
  };

  const onSubmit = (data: ResumeData) => {
    // TODO: 저장 API 스펙 확정 후 API 계층으로 이동
    console.log(data);
    navigateNext();
  };

  const handleSkip = () => {
    navigateNext();
  };

  return (
    <div>
      <FormStepHeader totalSteps={TOTAL_STEPS} currentStep={stepNumber} title={stepTitle} />

      <div className="border-border-light bg-bg-primary rounded-b-[20px] border p-11">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-11">
          <div className="flex flex-col gap-[34px]">
            <PersonalInfoSection register={register} />
            <EducationSection
              fields={education.fields}
              register={register}
              append={education.append}
              remove={education.remove}
            />
            <CertificationSection
              fields={certifications.fields}
              register={register}
              append={certifications.append}
              remove={certifications.remove}
            />
            <AwardSection
              fields={awards.fields}
              register={register}
              append={awards.append}
              remove={awards.remove}
            />
            <CareerSection
              fields={careers.fields}
              register={register}
              append={careers.append}
              remove={careers.remove}
            />
          </div>

          <div className="flex items-center justify-end gap-3.5">
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
        </form>
      </div>
    </div>
  );
}
