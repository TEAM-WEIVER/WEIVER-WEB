'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { useSignupStore } from '@/store/signup-store';
import { getNextStep, getPrevStep, getStepNumber } from '@/lib/signup-flow';
import type { SignupType } from '@/store/signup-store';
import { corporateTermsSchema, individualTermsSchema } from '@/schemas/signup';
import type { CorporateTermsData, IndividualTermsData } from '@/schemas/signup';

/* ─── 약관 항목 정의 ─── */

interface TermItem {
  key: string;
  title: string;
  required: boolean;
  content: string;
  agreeLabel: string;
}

const CORPORATE_TERMS: TermItem[] = [
  {
    key: 'serviceTerms',
    title: '서비스 이용약관',
    required: true,
    agreeLabel: '서비스 이용약관을 읽고 동의합니다.',
    content: `제1조 (목적)
본 약관은 (주)피우다(이하 "회사")가 제공하는 AI 기반 채용 매칭 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (용어 정의)
1. "회원"이란 본 약관에 동의하고 서비스를 이용하는 기업 회원 및 지원자 회원을 말합니다.
2. "AI 분석"이란 회원이 제공한 정보(이력서, 자소서, 면접 응답 등)를 기반으로 회사의 알고리즘이 분석·요약·추천하는 기능을 의미합니다.
3. "콘텐츠"란 회원이 서비스 내에 입력·업로드한 모든 텍스트, 파일, 영상, 음성 데이터를 말합니다.

제3조 (서비스의 성격)
회사가 제공하는 AI 분석 결과는 채용 의사결정을 보조하는 참고 자료이며, 최종 판단과 책임은 이를 활용하는 회원에게 있습니다.

제4조 (회원의 의무)
회원은 다음 행위를 하여서는 안 됩니다.
허위 정보 입력
타인의 개인정보 무단 사용
서비스 결과의 무단 복제 또는 외부 공개
서비스를 이용한 차별적 채용 행위`,
  },
  {
    key: 'privacyPolicy',
    title: '개인정보 처리방침',
    required: true,
    agreeLabel: '개인정보 처리방침을 읽고 동의합니다.',
    content: `수집 항목
• 공통: 이메일, 비밀번호, 이름
• 기업: 기업명, 담당자 정보, 기업 문화 및 채용 정보
• 지원자: 이력서, 자소서, 면접 응답(영상·음성 포함)

이용 목적
회원 관리
AI 분석 및 매칭
서비스 개선 및 품질 고도화`,
  },
  {
    key: 'corporateTerms',
    title: '기업회원 이용약관',
    required: true,
    agreeLabel: '기업회원 이용약관을 읽고 동의합니다.',
    content: `제1조 (기업 회원의 책임)
기업 회원은 AI 분석 결과를 참고 자료로 활용해야 하며,
채용 결과 및 그에 따른 법적 책임은 기업 회원에게 귀속됩니다.

제2조 (차별적 이용 금지)
기업 회원은 서비스 이용 시 다음 행위를 해서는 안 됩니다.
성별, 연령, 출신, 신체 조건 등을 이유로 한 차별
AI 분석 결과만을 근거로 한 자동 탈락 처리`,
  },
  {
    key: 'marketingConsent',
    title: '마케팅 정보 수신동의 (선택)',
    required: false,
    agreeLabel: '마케팅 정보 수신동의를 읽고 동의합니다.',
    content: `제1조 (목적)
본 동의서는 (주)피우다(이하 "회사")가 제공하는 서비스와 관련하여
신규 기능 안내, 서비스 업데이트, 이벤트 및 프로모션 정보 등을
회원에게 제공하기 위한 마케팅 정보 수신에 대한 동의를 받기 위함입니다.

제2조 (수신 정보의 내용)
회사가 회원에게 제공하는 마케팅 정보의 내용은 다음과 같습니다.
서비스 신규 기능 및 개선 사항 안내
AI 채용 서비스 관련 업데이트 및 활용 가이드
이벤트, 프로모션, 설문조사 안내
채용 및 HR 트렌드 콘텐츠, 서비스 활용 사례 안내`,
  },
];

// 개인회원 약관 (나중에 항목 추가 예정)
const INDIVIDUAL_TERMS: TermItem[] = [
  { ...CORPORATE_TERMS[0] }, // 서비스 이용약관
  { ...CORPORATE_TERMS[1] }, // 개인정보 처리방침
  {
    key: 'individualTerms',
    title: '개인회원 이용약관',
    required: true,
    agreeLabel: '개인회원 이용약관을 읽고 동의합니다.',
    content: `제1조 (지원자 회원의 책임)
지원자 회원은 정확한 정보를 입력해야 하며,
허위 정보 입력으로 인한 불이익은 지원자 본인에게 있습니다.

제2조 (AI 분석 결과의 활용)
AI 분석 결과는 참고 자료이며,
최종 채용 여부는 기업의 판단에 따릅니다.`,
  },
  { ...CORPORATE_TERMS[3] }, // 마케팅 정보 수신동의
];

/* ─── 체크박스 컴포넌트 ─── */

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="flex shrink-0 cursor-pointer">
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded border transition-colors ${
          checked
            ? 'border-[var(--primary-700)] bg-[var(--primary-700)]'
            : 'border-[var(--border-default)] bg-white'
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
    </button>
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
        <h3 className="text-h4 text-[var(--text-primary)]">{item.title}</h3>
        {item.required && <span className="text-body2 text-[var(--error)]">*</span>}
      </div>

      {/* 약관 본문 */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-5 py-3.5">
        <div className="h-[124px] overflow-y-auto">
          <p className="text-body2 whitespace-pre-line text-black">{item.content}</p>
        </div>
      </div>

      {/* 동의 체크박스 */}
      <div className="flex items-center gap-2.5 rounded-lg bg-[var(--bg-tertiary)] px-5 py-3">
        <Checkbox checked={checked} onChange={onToggle} />
        <span className="text-body2 text-[var(--text-secondary)]">{item.agreeLabel}</span>
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

  const isCorporate = params.type === 'corporate';
  const termItems = isCorporate ? CORPORATE_TERMS : INDIVIDUAL_TERMS;
  const schema = isCorporate ? corporateTermsSchema : individualTermsSchema;

  // 기본값: 저장된 값 또는 전부 false
  const defaultValues = Object.fromEntries(
    termItems.map((item) => [item.key, savedTerms[item.key] ?? false]),
  );

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { isValid },
  } = useForm<CorporateTermsData | IndividualTermsData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const watchedValues = watch();
  const allChecked = termItems.every(
    (item) => watchedValues[item.key as keyof typeof watchedValues],
  );

  const handleToggleAll = () => {
    const next = !allChecked;
    termItems.forEach((item) => {
      setValue(item.key as keyof (CorporateTermsData | IndividualTermsData), next, {
        shouldValidate: true,
      });
    });
  };

  const handleToggle = (key: string) => {
    const current = watchedValues[key as keyof typeof watchedValues];
    setValue(key as keyof (CorporateTermsData | IndividualTermsData), !current, {
      shouldValidate: true,
    });
  };

  const type = params.type as SignupType;
  const stepNumber = getStepNumber(type, 'terms');
  const nextStep = getNextStep(type, 'terms');
  const prevStep = getPrevStep(type, 'terms');

  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const onSubmit = (data: Record<string, boolean>) => {
    setTerms(data);
    setShowCompleteModal(true);
  };

  const handleModalConfirm = () => {
    setShowCompleteModal(false);
    if (isCorporate) {
      router.push('/corporate/dashboard');
    } else {
      router.push('/onboarding/resume');
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
          <h1 className="text-h2 text-[var(--text-secondary)]">약관에 동의해주세요</h1>
          <p className="text-body2 text-[var(--text-tertiary)]">
            {stepNumber}단계 : 정보 수집 및 이용에 대한 약관에 동의해주세요.
          </p>
        </div>

        {/* 모두 동의 */}
        <div className="flex flex-col gap-2 rounded-lg bg-[var(--bg-tertiary)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Checkbox checked={allChecked} onChange={handleToggleAll} />
            <span className="text-body2 font-medium text-[var(--text-secondary)]">
              모두 동의합니다.
            </span>
          </div>
          <p className="text-body3 pl-8 text-[var(--text-tertiary)]">
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
            checked={!!watchedValues[item.key as keyof typeof watchedValues]}
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
          className="gap-1 border-[var(--border-default)]"
        >
          <ArrowLeft size={16} />
          이전 단계
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
          다음 단계
        </Button>
      </div>

      <ConfirmModal
        open={showCompleteModal}
        title="회원가입이 완료되었습니다!"
        description={
          isCorporate
            ? '공고를 추가하고 딱 맞는 지원자를 매칭받아보세요.'
            : '서류를 작성하고 딱 맞는 기업을 매칭받아보세요.\n(개인정보 외에는 이후에 작성이 가능합니다.)'
        }
        buttonText={isCorporate ? '홈으로 이동' : '이력서 작성하기'}
        onConfirm={handleModalConfirm}
      />
    </form>
  );
}
