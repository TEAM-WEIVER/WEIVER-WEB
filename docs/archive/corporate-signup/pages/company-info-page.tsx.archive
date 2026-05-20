'use client';

import { useParams, useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  FieldError,
  formControlClass,
  formTextareaClass,
  nativeSelectClass,
} from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getNextStep, getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { companyInfoSchema, type CompanyInfoData } from '@/schemas/signup';
import { useSignupStore, type SignupType } from '@/store/signup-store';

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`bg-primary-700 w-1 ${description ? 'h-12' : 'h-7'}`} />
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-text-primary">{title}</h2>
        {description ? <p className="text-caption text-text-tertiary">{description}</p> : null}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-h4 text-text-secondary">{children}</p>;
}

function WorkStyleChoice({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`text-body2 text-text-primary flex min-h-12 items-center justify-center rounded-lg border px-4 py-3.5 text-center transition-colors ${
        selected
          ? 'border-success bg-[#f4fffe]'
          : 'border-border-default bg-bg-primary hover:bg-bg-tertiary'
      }`}
    >
      {label}
    </button>
  );
}

const WORK_STYLE_CATEGORIES = [
  {
    label: '업무 진행 속도',
    field: 'workSpeed' as const,
    options: ['빠른 실행, 이후에 보완', '충분한 논의, 신중하게 실행'],
  },
  {
    label: '의사결정 주체',
    field: 'decisionMaking' as const,
    options: ['담당자의 판단 존중', '팀 논의 및 합의가 중요'],
  },
  {
    label: '역할 정의 방식',
    field: 'roleDefinition' as const,
    options: ['상황에 따라 유연한 역할', '역할과 책임이 비교적 명확'],
  },
  {
    label: '운영 방식',
    field: 'operationStyle' as const,
    options: ['실험과 빠른 학습', '안정적인 운영과 지속성'],
  },
];

const fieldInputClass = formControlClass;
const dropdownClass = `${nativeSelectClass} w-full`;

export default function CompanyInfoPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type as SignupType;
  const savedCompanyInfo = useSignupStore((state) => state.companyInfo);
  const setCompanyInfo = useSignupStore((state) => state.setCompanyInfo);

  const stepNumber = getStepNumber(type, 'company-info');
  const nextStep = getNextStep(type, 'company-info');
  const prevStep = getPrevStep(type, 'company-info');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: savedCompanyInfo,
    mode: 'onChange',
  });

  const cultureValue = useWatch({ control, name: 'culture' }) ?? '';
  const workStyleNoteValue = useWatch({ control, name: 'workStyleNote' }) ?? '';
  const cultureOverLimit = cultureValue.length > 300;
  const workStyleNoteOverLimit = workStyleNoteValue.length > 80;

  const onSubmit = (data: CompanyInfoData) => {
    setCompanyInfo(data);
    if (nextStep) router.push(`/signup/${type}/${nextStep}`);
  };

  const handleBack = () => {
    if (prevStep) router.push(`/signup/${type}/${prevStep}`);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-[974px] flex-col gap-11"
    >
      <div className="flex flex-col gap-[34px]">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">기업 정보를 입력해주세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 기본 정보 및 문화, 업무 방식에 대해서 작성해주세요.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SectionTitle title="기본 정보" />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <label className="border-border-light bg-bg-tertiary hover:bg-primary-200 flex h-[140px] w-[140px] shrink-0 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-lg border transition-colors">
              <ImageIcon size={24} className="text-text-tertiary" />
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-body2 text-text-tertiary">기업로고 업로드</span>
                <span className="text-caption text-text-disabled">JPG, PNG 2MB 이하</span>
              </div>
              <input type="file" accept="image/jpeg,image/png" className="hidden" />
            </label>

            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <div className="grid gap-3.5 md:grid-cols-2 lg:gap-[34px]">
                <div className="flex min-w-0 flex-col gap-2">
                  <FieldLabel>기업 형태</FieldLabel>
                  <select {...register('companyType')} className={dropdownClass}>
                    <option value="">기업 형태를 선택해주세요</option>
                    <option value="대기업">대기업</option>
                    <option value="중견기업">중견기업</option>
                    <option value="중소기업">중소기업</option>
                    <option value="스타트업">스타트업</option>
                    <option value="공기업">공기업</option>
                    <option value="외국계">외국계</option>
                  </select>
                  <FieldError>{errors.companyType?.message}</FieldError>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <FieldLabel>사원수</FieldLabel>
                  <Input
                    {...register('employeeCount')}
                    placeholder="숫자만 입력"
                    className={fieldInputClass}
                  />
                  <FieldError>{errors.employeeCount?.message}</FieldError>
                </div>
              </div>
              <div className="grid gap-3.5 md:grid-cols-2 lg:gap-[34px]">
                <div className="flex min-w-0 flex-col gap-2">
                  <FieldLabel>대표명</FieldLabel>
                  <Input
                    {...register('ceoName')}
                    placeholder="영어, 한글 최대 10자 입력 가능"
                    className={fieldInputClass}
                  />
                  <FieldError>{errors.ceoName?.message}</FieldError>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <FieldLabel>설립연도</FieldLabel>
                  <Input
                    {...register('foundedYear')}
                    placeholder="e.g. 2003 (숫자만 입력)"
                    className={fieldInputClass}
                  />
                  <FieldError>{errors.foundedYear?.message}</FieldError>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel>평균매출액</FieldLabel>
              <Input
                {...register('averageRevenue')}
                placeholder="숫자만 입력"
                className={fieldInputClass}
              />
              <FieldError>{errors.averageRevenue?.message}</FieldError>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <FieldLabel>웹사이트</FieldLabel>
              <Input {...register('website')} placeholder="URL 입력" className={fieldInputClass} />
              <FieldError>{errors.website?.message}</FieldError>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel>회사 주소</FieldLabel>
            <Input
              {...register('companyAddress')}
              placeholder="주소를 정확하게 입력해주세요."
              className={fieldInputClass}
            />
            <FieldError>{errors.companyAddress?.message}</FieldError>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <SectionTitle
            title="AI 인사이트"
            description="AI 분석을 위해 회사에 대한 문화와 업무 방식을 알려주세요."
          />

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between">
                <FieldLabel>기업 문화 및 방향성</FieldLabel>
                <p
                  className={`text-caption text-right ${
                    cultureOverLimit ? 'text-error' : 'text-text-tertiary'
                  }`}
                >
                  {cultureValue.length}/300
                </p>
              </div>
              <Textarea
                {...register('culture')}
                placeholder={`명확한 키워드가 포함되도록 2~3줄 정도로 작성해주세요.\ne.g. 우리는 사회적 가치를 추구합니다.`}
                className={`${formTextareaClass} min-h-[120px] resize-none ${
                  cultureOverLimit
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              <FieldError>{errors.culture?.message}</FieldError>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <FieldLabel>업무 방식</FieldLabel>
                <p className="text-caption text-text-tertiary">
                  각 항목 당 하나의 스타일을 선택해주세요.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {WORK_STYLE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.label}
                      className="bg-bg-tertiary flex min-h-[22px] items-center justify-center rounded px-2"
                    >
                      <span className="text-caption text-text-tertiary text-center">
                        {cat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {[0, 1].map((rowIdx) => (
                  <div key={rowIdx} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {WORK_STYLE_CATEGORIES.map((cat) => (
                      <Controller
                        key={`${cat.field}-${rowIdx}`}
                        control={control}
                        name={cat.field}
                        render={({ field }) => (
                          <WorkStyleChoice
                            label={cat.options[rowIdx]}
                            selected={field.value === cat.options[rowIdx]}
                            onClick={() =>
                              field.onChange(
                                field.value === cat.options[rowIdx] ? '' : cat.options[rowIdx],
                              )
                            }
                          />
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <p
                  className={`text-caption text-right ${
                    workStyleNoteOverLimit ? 'text-error' : 'text-text-tertiary'
                  }`}
                >
                  {workStyleNoteValue.length}/80
                </p>
              </div>
              <Input
                {...register('workStyleNote')}
                placeholder="업무 방식에 대해 추가로 설명하고 싶은게 있나요?"
                className={`${fieldInputClass} ${
                  workStyleNoteOverLimit
                    ? 'border-error focus-visible:border-error focus-visible:ring-error/20'
                    : ''
                }`}
              />
              <FieldError>{errors.workStyleNote?.message}</FieldError>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="outline" size="xs" onClick={handleBack}>
          <ArrowLeft size={20} />
          이전 단계
        </Button>
        <Button type="submit" size="xs" disabled={!isValid}>
          다음 단계
          <ArrowRight size={20} />
        </Button>
      </div>
    </form>
  );
}
