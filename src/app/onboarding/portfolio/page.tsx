'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  TOTAL_STEPS,
  getOnboardingPath,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getPrevOnboardingStep,
} from '@/lib/onboarding-flow';
import {
  getPortfolio,
  postPortfolio,
  patchPortfolio,
} from '@/lib/onboarding-api';
import { portfolioSchema, type PortfolioData } from '@/schemas/onboarding';

import { OnboardingStepShell } from '../_components/onboarding-step-shell';
import { AgreementSection } from './_components/agreement-section';
import { ExternalLinksSection } from './_components/external-links-section';
import { FileUploadSection } from './_components/file-upload-section';
import { usePortfolioFile } from './_hooks/use-portfolio-file';

const CURRENT_STEP = 'portfolio' as const;

export default function PortfolioPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const portfolioCompletedRef = useRef(false);
  const portfolioIdRef = useRef<string | null>(null);

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const prevStep = getPrevOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const portfolioRes = await getPortfolio();
        const portfolio = portfolioRes.data;
        if (portfolio.urlGithub) setValue('githubUrl', portfolio.urlGithub);
        if (portfolio.urlTech) setValue('notionUrl', portfolio.urlTech);
        if (portfolio.urlEtc) setValue('otherUrl', portfolio.urlEtc);
        if (portfolio.portfolioId) {
          portfolioCompletedRef.current = true;
          portfolioIdRef.current = portfolio.portfolioId;
        }
      } catch {
        // 로드 실패 시 빈 폼으로 진행
      }
    }

    loadPortfolio();
  }, [setValue]);

  const isSubmitEnabled = isValid && portfolioFile.uploadedFile !== null && !portfolioFile.fileError;

  const onSubmit = async (data: PortfolioData) => {
    if (!portfolioFile.uploadedFile) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      const requestDTO = {
        urlGithub: data.githubUrl || null,
        urlTech: data.notionUrl || null,
        urlEtc: data.otherUrl || null,
      };
      formData.append(
        'requestDTO',
        new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }),
      );
      formData.append('portfolio', portfolioFile.uploadedFile);

      if (portfolioCompletedRef.current && portfolioIdRef.current) {
        await patchPortfolio(portfolioIdRef.current, formData);
      } else {
        await postPortfolio(formData);
      }

      router.push('/applicant/dashboard');
    } catch {
      setSubmitError('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
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
                disabled={isSubmitting}
                className="border-error text-error hover:bg-error/5"
              >
                나중에 작성
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={!isSubmitEnabled || isSubmitting}
                aria-busy={isSubmitting}
                aria-disabled={!isSubmitEnabled || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    업로드 중
                  </>
                ) : (
                  '제출'
                )}
              </Button>
            </div>
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
