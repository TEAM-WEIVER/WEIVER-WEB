'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { ActionConfirmDialog } from '../../../../_components/action-confirm-dialog';

const DELETE_CONTENT = {
  title: '리포트를 삭제하시겠습니까?',
  description: ['리포트를 삭제하면 복구와 지원자 컨택이 불가능합니다.', '신중하게 고민 후 삭제해주세요.'],
  confirmLabel: '삭제',
  completedTitle: '리포트가 삭제되었습니다.',
  completedDescription: '지원자 리포트 삭제 처리가 완료되었습니다.',
} as const;

export function ReportDeleteButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="border-error text-error hover:bg-error/5 h-[42px] w-[132px] rounded-[10px] bg-transparent shadow-none"
        onClick={() => setIsConfirmOpen(true)}
      >
        <Trash2 className="size-4" />
        리포트 삭제하기
      </Button>

      <ActionConfirmDialog
        open={isConfirmOpen}
        title={DELETE_CONTENT.title}
        description={DELETE_CONTENT.description}
        confirmLabel={DELETE_CONTENT.confirmLabel}
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
        title={DELETE_CONTENT.completedTitle}
        description={DELETE_CONTENT.completedDescription}
        confirmLabel="확인"
        onConfirm={() => setIsCompletedOpen(false)}
        onCancel={() => setIsCompletedOpen(false)}
      />
    </>
  );
}
