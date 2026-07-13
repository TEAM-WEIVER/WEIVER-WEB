import { cn } from '@/lib/utils';

interface InterviewErrorBannerProps {
  message: string;
  className?: string;
}

export function InterviewErrorBanner({ message, className }: InterviewErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'bg-destructive/10 border-destructive/30 text-destructive rounded-lg border px-4 py-3',
        className,
      )}
    >
      <p className="text-body2">{message}</p>
    </div>
  );
}
