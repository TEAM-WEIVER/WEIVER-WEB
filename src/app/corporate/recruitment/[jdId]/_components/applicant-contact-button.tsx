'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSendContactMail } from '@/hooks/corporate/use-applicant';
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
  jdId?: number;
  applicantPublicId?: string;
  className?: string;
};

export function ApplicantContactButton({
  jdId,
  applicantPublicId,
  className,
}: ApplicantContactButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [contactErrorMessage, setContactErrorMessage] = useState<string | null>(null);
  const sendContactMail = useSendContactMail();
  const canSendContactMail = jdId !== undefined && applicantPublicId !== undefined;

  return (
    <>
      <Button
        type="button"
        size="xs"
        disabled={sendContactMail.isPending}
        className={cn('h-10 rounded-[10px]', className)}
        onClick={(event) => {
          event.stopPropagation();
          setContactErrorMessage(null);
          setIsConfirmOpen(true);
        }}
      >
        {sendContactMail.isPending ? '발송 중...' : '지원자 컨택하기'}
      </Button>

      <ActionConfirmDialog
        open={isConfirmOpen}
        title={CONTACT_CONTENT.title}
        description={contactErrorMessage ?? CONTACT_CONTENT.description}
        confirmLabel={CONTACT_CONTENT.confirmLabel}
        cancelLabel="취소"
        onCancel={() => {
          setContactErrorMessage(null);
          setIsConfirmOpen(false);
        }}
        onConfirm={async () => {
          try {
            if (canSendContactMail) {
              await sendContactMail.mutate(jdId, applicantPublicId);
            }
            setContactErrorMessage(null);
            setIsConfirmOpen(false);
            setIsCompletedOpen(true);
          } catch {
            setContactErrorMessage('컨택 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
          }
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
