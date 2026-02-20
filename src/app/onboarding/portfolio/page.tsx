'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CloudUpload, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormStepHeader } from '@/components/common/form-step-header';
import {
  TOTAL_STEPS,
  getOnboardingStepNumber,
  getOnboardingStepTitle,
  getPrevOnboardingStep,
  getOnboardingPath,
} from '@/lib/onboarding-flow';
import { portfolioSchema, type PortfolioData } from '@/schemas/onboarding';

const CURRENT_STEP = 'portfolio' as const;

const fieldInputClass =
  'text-body2 h-12 rounded-lg border-[var(--border-light)] bg-[var(--bg-secondary)] px-5 py-3 shadow-none placeholder:text-[var(--text-disabled)]';

/* ─── 섹션 제목 ─── */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-1 bg-[var(--primary-700)]" />
      <h2 className="text-h3 text-[var(--text-primary)]">{title}</h2>
    </div>
  );
}

/* ─── GitHub 아이콘 ─── */

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ─── PDF 파일 아이콘 ─── */

function PdfFileIcon() {
  return (
    <svg width={25} height={30} viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.5 0H3.5C1.85 0 0.515 1.35 0.515 3L0.5 27C0.5 28.65 1.835 30 3.485 30H21.5C23.15 30 24.5 28.65 24.5 27V9L15.5 0Z"
        fill="#E8EDF2"
      />
      <path d="M16.5 0V8C16.5 8.55 16.95 9 17.5 9H24.5L16.5 0Z" fill="#C4CDD5" />
      <rect x="0.5" y="16" width="16" height="10" rx="2" fill="#FF3E4C" />
      <text
        x="8.5"
        y="23.5"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="700"
        fontFamily="Pretendard, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

/* ─── Notion 아이콘 ─── */

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.49 2.45c-.42-.326-.98-.7-2.055-.607L3.48 2.874c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.747-.886l-15.177.886c-.56.047-.748.327-.748.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V8.528L7.326 8.34c-.093-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.79 1.288l13.728-1.02c1.682-.14 2.101-.046 3.149.7l4.344 3.032c.747.56.98.886.98 1.632v15.71c0 .98-.374 1.586-1.682 1.68l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.746-.793-1.306-.793-1.96V2.967c0-.84.374-1.54 1.822-1.68z" />
    </svg>
  );
}

/* ─── 파일 크기 포맷 ─── */

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

/* ─── 메인 페이지 ─── */

export default function PortfolioPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const stepNumber = getOnboardingStepNumber(CURRENT_STEP);
  const stepTitle = getOnboardingStepTitle(CURRENT_STEP);
  const prevStep = getPrevOnboardingStep(CURRENT_STEP);

  const {
    register,
    handleSubmit,
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

  const handleFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') {
      setUploadedFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const removeFile = useCallback(() => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const onSubmit = (data: PortfolioData) => {
    // TODO: API 연동 (파일 업로드 + 링크 저장)
    console.log({ ...data, file: uploadedFile });
    router.push('/');
  };

  const handleSkip = () => {
    router.push('/');
  };

  const handleBack = () => {
    if (prevStep) router.push(getOnboardingPath(prevStep));
  };

  return (
    <div>
      <FormStepHeader totalSteps={TOTAL_STEPS} currentStep={stepNumber} title={stepTitle} />

      <div className="rounded-b-[20px] border border-[var(--border-light)] bg-[var(--bg-primary)] p-11">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-11">
          <div className="flex flex-col gap-[34px]">
            {/* ── 포트폴리오 파일 업로드 ── */}
            <div className="flex flex-col gap-6">
              <SectionTitle title="포트폴리오 파일 업로드" />

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadedFile ? (
                  <div className="flex items-center justify-between rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-primary)] px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center">
                        <PdfFileIcon />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-body2 truncate text-[var(--text-secondary)]">
                          {uploadedFile.name}
                        </span>
                        <span className="text-caption text-[var(--text-disabled)]">
                          {formatFileSize(uploadedFile.size)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="shrink-0 p-1 text-[var(--border-default)] transition-colors hover:text-[var(--error)]"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[10px] border border-dashed px-10 py-12 transition-colors ${
                      isDragging
                        ? 'border-[var(--primary-700)] bg-[var(--primary-200)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <CloudUpload size={24} className="text-[var(--icon-muted)]" />
                    <div className="flex flex-col items-center gap-1.5">
                      <p className="text-body1 text-[var(--text-secondary)]">
                        클릭하거나 파일을 드래그하여 업로드하세요
                      </p>
                      <p className="text-body3 text-[var(--text-disabled)]">
                        PDF 파일만 업로드 가능 (최대 1TB)
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* ── 포트폴리오 링크 ── */}
            <div className="flex flex-col gap-6">
              <SectionTitle title="포트폴리오 링크 (선택)" />

              <div className="flex flex-col gap-3.5">
                {/* Github */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <GithubIcon />
                    <span className="text-body1 text-[var(--text-secondary)]">Github</span>
                  </div>
                  <Input
                    {...register('githubUrl')}
                    placeholder="https://github.com/username"
                    className={fieldInputClass}
                  />
                </div>

                {/* Notion */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <NotionIcon />
                    <span className="text-body1 text-[var(--text-secondary)]">Notion</span>
                  </div>
                  <Input
                    {...register('notionUrl')}
                    placeholder="https://notion.so/..."
                    className={fieldInputClass}
                  />
                </div>

                {/* 기타 */}
                <div className="flex flex-col gap-2">
                  <span className="text-body1 text-[var(--text-secondary)]">기타 개인 사이트</span>
                  <Input
                    {...register('otherUrl')}
                    placeholder="https://..."
                    className={fieldInputClass}
                  />
                </div>
              </div>
            </div>

            {/* ── 동의 체크박스 ── */}
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-[var(--bg-tertiary)] px-5 py-3">
              <input
                type="checkbox"
                {...register('agreement')}
                className="h-[22px] w-[22px] shrink-0 cursor-pointer appearance-none rounded border border-[var(--border-default)] bg-[var(--bg-primary)] checked:border-[var(--primary-700)] checked:bg-[var(--primary-700)] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%206L9%2017l-5-5%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat"
              />
              <span className="text-body2 text-[var(--text-secondary)]">
                제공한 정보가 정확함을 확인하며, 채용 절차를 위해 개인정보가 활용되는 것에
                동의합니다.
              </span>
            </label>
          </div>

          {/* ── 하단 버튼 ── */}
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
                className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/5"
              >
                나중에 작성
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={!isValid}
                className={
                  isValid
                    ? ''
                    : 'bg-[var(--primary-200)] text-[var(--text-tertiary)] hover:bg-[var(--primary-200)] disabled:opacity-100'
                }
              >
                제출
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
