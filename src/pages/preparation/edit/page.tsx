import { useState } from 'react';

import { BackButton } from '@/components/common/back-button';
import { SectionHeading } from '@/components/common/section-heading';
import type { JobPostingValues } from '@/schemas/job-posting';

import { JobPostingForm } from '../_components/job-posting-form';
import type { JobPostingDetail } from '../_types/job-posting-detail';

type PreparationEditPageProps = {
  /** 조회 완료 후 렌더링한다. 다른 공고로 전환 시 페이지 key에 공고 id를 지정한다. */
  posting: JobPostingDetail;
  onBack: () => void;
  onSubmit: (values: JobPostingValues) => Promise<void>;
};

export default function PreparationEditPage({
  posting,
  onBack,
  onSubmit,
}: PreparationEditPageProps) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(values: JobPostingValues) {
    setIsSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-15">
      <BackButton onClick={onBack} disabled={isSaving} className="-mt-2 mb-6">
        공고 상세
      </BackButton>
      <div className="border-border-light mb-6 border-b pb-5">
        <SectionHeading
          as="h1"
          title="지원 공고 수정"
          description="등록한 공고 정보를 확인하고 변경할 내용을 수정해주세요."
        />
      </div>
      <JobPostingForm
        key={posting.id}
        mode="edit"
        initialValues={posting}
        onSubmit={handleSubmit}
        onCancel={onBack}
      />
    </main>
  );
}
