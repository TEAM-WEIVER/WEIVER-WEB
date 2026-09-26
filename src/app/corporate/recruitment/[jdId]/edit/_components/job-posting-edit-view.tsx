'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { JobPostingForm } from '@/app/corporate/recruitment/new/_components/job-posting-form';
import {
  toJobPostingFormValue,
  toUpdateFormData,
} from '@/app/corporate/recruitment/new/_components/job-posting-form.utils';
import { ActionConfirmDialog } from '@/app/corporate/recruitment/[jdId]/_components/action-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  useDeleteJobPosting,
  useJobPosting,
  useUpdateJobPosting,
} from '@/hooks/corporate/use-job-posting';
import type { JobPostingRequest } from '@/schemas/corporate/job-posting';

export function JobPostingEditView({ jdId }: { jdId: string }) {
  const router = useRouter();
  const numericJdId = Number(jdId);
  const isValidJdId = Number.isInteger(numericJdId) && numericJdId > 0;
  const jobPosting = useJobPosting(numericJdId);
  const updateJobPosting = useUpdateJobPosting();
  const deleteJobPosting = useDeleteJobPosting();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUpdate = async (request: JobPostingRequest) => {
    await updateJobPosting.mutate(
      numericJdId,
      toUpdateFormData({ ...request, isEmailBannerDeleted: false }),
    );
    router.replace(`/corporate/recruitment/${numericJdId}?refresh=${Date.now()}`);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteJobPosting.mutate(numericJdId);
      router.replace('/corporate/dashboard');
    } catch {
      setDeleteError('공고 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  if (!isValidJdId) {
    return (
      <p className="text-body2 text-error" role="alert">
        올바른 공고 번호가 아닙니다.
      </p>
    );
  }

  if (jobPosting.isLoading) {
    return (
      <div aria-label="공고 정보 로딩 중" className="flex flex-col gap-3" role="status">
        <div className="bg-bg-tertiary h-10 animate-pulse rounded-lg" />
        <div className="bg-bg-tertiary h-48 animate-pulse rounded-[20px]" />
      </div>
    );
  }

  if (jobPosting.error || !jobPosting.data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-body2 text-error" role="alert">
          공고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button type="button" variant="outline" onClick={jobPosting.refetch}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <>
      <JobPostingForm
        key={jobPosting.data.jdId}
        initialValue={toJobPostingFormValue(jobPosting.data)}
        isSubmitting={updateJobPosting.isPending || deleteJobPosting.isPending}
        mode="edit"
        onDelete={() => setIsDeleteDialogOpen(true)}
        onSubmit={handleUpdate}
      />
      <ActionConfirmDialog
        open={isDeleteDialogOpen}
        title="공고를 삭제할까요?"
        description={
          deleteError
            ? ['삭제한 공고는 복구할 수 없습니다.', deleteError]
            : '삭제한 공고는 복구할 수 없습니다.'
        }
        confirmLabel={deleteJobPosting.isPending ? '삭제 중...' : '삭제'}
        onCancel={() => {
          if (!deleteJobPosting.isPending) setIsDeleteDialogOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
