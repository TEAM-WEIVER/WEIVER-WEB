import { cn } from '@/lib/utils';

const STATUS_META = {
  ACTIVE: {
    label: '진행중',
    className: 'border-info bg-bg-tertiary',
  },
  CLOSED: {
    label: '종료',
    className: 'border-error bg-error/10',
  },
  DRAFT: {
    label: '임시저장',
    className: 'border-warning bg-warning/10',
  },
} as const;

type StatusTagProps = {
  status: string;
};

export function getStatusLabel(status: string) {
  return STATUS_META[status as keyof typeof STATUS_META]?.label ?? status;
}

export function StatusTag({ status }: StatusTagProps) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];

  return (
    <span
      className={cn(
        'text-body2 text-text-primary inline-flex h-6 items-center justify-center rounded-md border px-1.5',
        meta?.className ?? 'border-border-default bg-bg-tertiary',
      )}
    >
      {meta?.label ?? status}
    </span>
  );
}
