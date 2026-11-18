import type { ComponentProps } from 'react';
import { PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const INTERVIEW_START_LABEL = 'AI 면접 시작';

type InterviewStartButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'asChild' | 'variant' | 'size'
>;

export function InterviewStartButton({
  className,
  isLoading,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}: InterviewStartButtonProps) {
  return (
    <Button
      {...props}
      type={type}
      isLoading={isLoading}
      aria-label={ariaLabel ?? (isLoading ? INTERVIEW_START_LABEL : undefined)}
      className={cn(
        'disabled:bg-bg-tertiary disabled:text-text-disabled disabled:hover:bg-bg-tertiary h-9 gap-1.5 px-3 text-xs font-medium',
        isLoading && 'relative [&>[role=status]]:absolute',
        className,
      )}
    >
      <span className={cn('flex items-center gap-[inherit]', isLoading && 'invisible')}>
        <PlayCircle aria-hidden="true" />
        {INTERVIEW_START_LABEL}
      </span>
    </Button>
  );
}
