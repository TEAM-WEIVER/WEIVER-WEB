'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getOnboardingPath,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getPrevOnboardingStep,
} from '@/lib/onboarding-flow';
import { portfolioSchema, type PortfolioData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { AgreementSection } from './_components/agreement-section';
import { ExternalLinksSection } from './_components/external-links-section';
import { FileUploadSection } from './_components/file-upload-section';
import { usePortfolioFile } from './_hooks/use-portfolio-file';

const CURRENT_STEP = 'portfolio' as const;

export default function PortfolioPage() {
  const router = useRouter();

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const prevStep = getPrevOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<PortfolioData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      githubUrl: '',
      notionUrl: '',
      otherUrl: '',
      agreement: undefined,
    },
    mode: 'onChange',
  });

  const portfolioFile = usePortfolioFile();

  const onSubmit = (data: PortfolioData) => {
    // TODO: 파일 업로드 API와 링크 저장 API 스펙 확정 후 API 계층으로 이동
    console.log({ ...data, file: portfolioFile.uploadedFile });
    router.push('/applicant/dashboard');
  };

  const handleSkip = () => {
    router.push('/applicant/dashboard');
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
              제출
            </Button>
          </div>
        </div>
      }
    >
      <FileUploadSection
        fileInputRef={portfolioFile.fileInputRef}
        uploadedFile={portfolioFile.uploadedFile}
        fileError={portfolioFile.fileError}
        isDragging={portfolioFile.isDragging}
        onBrowse={portfolioFile.openFileDialog}
        onFileChange={portfolioFile.handleFileChange}
        onDragOver={portfolioFile.handleDragOver}
        onDragLeave={portfolioFile.handleDragLeave}
        onDrop={portfolioFile.handleDrop}
        onRemove={portfolioFile.removeFile}
      />
      <ExternalLinksSection register={register} />
      <AgreementSection control={control} />
    </OnboardingStepShell>
  );
}
