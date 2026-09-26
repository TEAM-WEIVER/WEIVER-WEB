import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  'aria-label'?: string;
}

function Spinner({ size = 'md', className, 'aria-label': ariaLabel = '로딩 중' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent',
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}

export { Spinner };
