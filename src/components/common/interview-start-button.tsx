import type { ComponentProps } from 'react';
import { PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type InterviewStartButtonProps = Omit<
  ComponentProps<typeof Button>,
  'children' | 'asChild' | 'variant' | 'size'
>;

export function InterviewStartButton({
  className,
  type = 'button',
  ...props
}: InterviewStartButtonProps) {
  return (
    <Button
      {...props}
      type={type}
      className={cn(
        'disabled:bg-bg-tertiary disabled:text-text-disabled disabled:hover:bg-bg-tertiary h-9 gap-1.5 bg-[#2DD4BF] px-3 text-xs font-medium text-[#0F172A] hover:bg-[#2DD4BF]/85 focus-visible:ring-[#2DD4BF]',
        className,
      )}
    >
      <PlayCircle aria-hidden="true" />
      AI 면접 시작
    </Button>
  );
}
