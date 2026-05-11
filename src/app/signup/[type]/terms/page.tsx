'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSignupStore } from '@/store/signup-store';
import { getPrevStep, getStepNumber } from '@/lib/signup-flow';
import { completeSignup } from '@/lib/signup-api';
import { CORPORATE_TERMS, INDIVIDUAL_TERMS, type TermItem } from '@/lib/signup-terms';
import type { SignupType } from '@/store/signup-store';
import { corporateTermsSchema, individualTermsSchema } from '@/schemas/signup';
import type { CorporateTermsData, IndividualTermsData } from '@/schemas/signup';

/* ─── 체크박스 컴포넌트 ─── */

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="flex shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
        aria-checked={checked}
      />
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded border transition-colors ${
          checked ? 'border-primary-700 bg-primary-700' : 'border-border-default bg-white'
        }`}
      >
        {checked && (
          <svg
            width="14"
            height="10"
            viewBox="0 0 14 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 5L5 9L13 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}

/* ─── 약관 섹션 컴포넌트 ─── */

function TermSection({
  item,
  checked,
  onToggle,
}: {
  item: TermItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {/* 제목 */}
      <div className="flex items-center gap-1.5">
        <h3 className="text-h4 text-text-primary">{item.title}</h3>
        {item.required && <span className="text-body2 text-error">*</span>}
      </div>

      {/* 약관 본문 */}
      <div className="border-border-default bg-bg-primary rounded-lg border px-5 py-3.5">
        <div className="h-[124px] overflow-y-auto">
          <p className="text-body2 whitespace-pre-line text-black">{item.content}</p>
        </div>
      </div>

      {/* 동의 체크박스 */}
      <div className="bg-bg-tertiary flex items-center gap-2.5 rounded-lg px-5 py-3">
        <Checkbox checked={checked} onChange={onToggle} />
        <span className="text-body2 text-text-secondary">{item.agreeLabel}</span>
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ─── */

export default function TermsPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const setTerms = useSignupStore((state) => state.setTerms);
  const savedTerms = useSignupStore((state) => state.terms);
  const account = useSignupStore((state) => state.account);
  const companyInfo = useSignupStore((state) => state.companyInfo);

  const isCorporate = params.type === 'corporate';
  const termItems = isCorporate ? CORPORATE_TERMS : INDIVIDUAL_TERMS;
  const schema = isCorporate ? corporateTermsSchema : individualTermsSchema;

  // 기본값: 저장된 값 또는 전부 false
  const defaultValues = Object.fromEntries(
    termItems.map((item) => [item.key, savedTerms[item.key] ?? false]),
  );

  const {
    setValue,
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<CorporateTermsData | IndividualTermsData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedValues =
    useWatch({
      control,
      name: termItems.map((item) => item.key) as Array<
        keyof (CorporateTermsData | IndividualTermsData)
      >,
    }) ?? [];

  const watchedTerms = Object.fromEntries(
    termItems.map((item, index) => [item.key, Boolean(watchedValues[index])]),
  );
  const allChecked = termItems.every((item) => watchedTerms[item.key]);

  const handleToggleAll = () => {
    const next = !allChecked;
    termItems.forEach((item) => {
      setValue(item.key as keyof (CorporateTermsData | IndividualTermsData), next, {
        shouldValidate: true,
      });
    });
  };

  const handleToggle = (key: string) => {
    const current = watchedTerms[key];
    setValue(key as keyof (CorporateTermsData | IndividualTermsData), !current, {
      shouldValidate: true,
    });
  };

  const type = params.type as SignupType;
  const stepNumber = getStepNumber(type, 'terms');
  const prevStep = getPrevStep(type, 'terms');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (data: Record<string, boolean>) => {
    setSubmitError(null);

    if (!account.email.trim()) {
      setSubmitError('계정 정보가 없습니다. 계정 입력 단계부터 다시 진행해주세요.');
      return;
    }

    try {
      await completeSignup({
        type,
        account,
        terms: data,
        companyInfo: isCorporate ? companyInfo : undefined,
      });
      setTerms(data);
      router.push(isCorporate ? '/corporate/dashboard' : '/onboarding/resume');
    } catch {
      setSubmitError('회원가입 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleBack = () => {
    if (prevStep) {
      router.push(`/signup/${type}/${prevStep}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
      className="flex flex-col gap-11"
    >
      {/* 콘텐츠 영역 */}
      <div className="flex flex-col gap-8">
        {/* 타이틀 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-text-secondary">약관에 동의해주세요</h1>
          <p className="text-body2 text-text-tertiary">
            {stepNumber}단계 : 정보 수집 및 이용에 대한 약관에 동의해주세요.
          </p>
        </div>

        {/* 모두 동의 */}
        <div className="bg-bg-tertiary flex flex-col gap-2 rounded-lg px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Checkbox checked={allChecked} onChange={handleToggleAll} />
            <span className="text-body2 text-text-secondary font-medium">모두 동의합니다.</span>
          </div>
          <p className="text-body3 text-text-tertiary pl-8">
            서비스 이용약관, 개인정보 처리방침, {isCorporate ? '기업회원' : '개인회원'} 이용약관,
            마케팅 정보 수신 동의에 대해 모두 동의합니다.
            <br />각 사항에 대한 동의 여부를 개별적으로 선택할 수 있으며, 선택 동의 사항에 대한
            동의를 거부하여도 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        {/* 개별 약관 섹션 */}
        {termItems.map((item) => (
          <TermSection
            key={item.key}
            item={item}
            checked={!!watchedTerms[item.key]}
            onToggle={() => handleToggle(item.key)}
          />
        ))}
      </div>

      {/* 하단 버튼 */}
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
