'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ActionConfirmDialog } from './action-confirm-dialog';

const CONTACT_CONTENT = {
  title: '지원자를 컨택하시겠습니까?',
  description: [
    '메일 템플릿을 기반으로 메일이 발송됩니다.',
    '메일 템플릿은 공고 수정에서 수정하실 수 있습니다.',
  ],
  confirmLabel: '컨택',
  completedTitle: '지원자 컨택 메일이 발송되었습니다.',
  completedDescription: '지원자에게 메일 템플릿 기반 컨택 메일을 발송했습니다.',
} as const;

type ApplicantContactButtonProps = {
  className?: string;
};

export function ApplicantContactButton({ className }: ApplicantContactButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="xs"
        className={cn('h-10 rounded-[10px]', className)}
        onClick={(event) => {
          event.stopPropagation();
          setIsConfirmOpen(true);
        }}
      >
        지원자 컨택하기
      </Button>

      <ActionConfirmDialog
        open={isConfirmOpen}
        title={CONTACT_CONTENT.title}
        description={CONTACT_CONTENT.description}
        confirmLabel={CONTACT_CONTENT.confirmLabel}
        cancelLabel="취소"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          setIsCompletedOpen(true);
        }}
      />

      <ActionConfirmDialog
        open={isCompletedOpen}
        variant="alert"
        title={CONTACT_CONTENT.completedTitle}
        description={CONTACT_CONTENT.completedDescription}
        confirmLabel="확인"
        onConfirm={() => setIsCompletedOpen(false)}
        onCancel={() => setIsCompletedOpen(false)}
      />
    </>
  );
}
