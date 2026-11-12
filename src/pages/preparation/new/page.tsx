import { BackButton } from '@/components/common/back-button';
import { SectionHeading } from '@/components/common/section-heading';

import { JobPostingForm, type JobPostingFormProps } from '../_components/job-posting-form';

type PreparationNewPageProps = JobPostingFormProps & { onBack: () => void };

export default function PreparationNewPage({ onBack, ...formProps }: PreparationNewPageProps) {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-15">
      <BackButton onClick={onBack} className="-mt-2 mb-6">
        지원 공고 목록
      </BackButton>
      <div className="border-border-light mb-6 border-b pb-5">
        <SectionHeading
          as="h1"
          title="지원 공고 등록"
          description="지원하려는 공고 정보를 입력하면 해당 직무에 맞는 AI 모의면접을 준비할 수 있어요."
        />
      </div>
      <JobPostingForm {...formProps} />
    </main>
  );
}
