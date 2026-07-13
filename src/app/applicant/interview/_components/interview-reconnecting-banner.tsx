import { cn } from '@/lib/utils';

interface InterviewReconnectingBannerProps {
  className?: string;
}

export function InterviewReconnectingBanner({ className }: InterviewReconnectingBannerProps) {
  return (
    <div
      role="status"
      aria-label="재연결 중"
      className={cn(
        'bg-primary-100 border-primary-200 text-primary-700 flex items-center gap-2 rounded-lg border px-4 py-3',
        className,
      )}
    >
      {/* 스피너 */}
      <svg
        className="size-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-body2">재연결 중입니다. 잠시만 기다려 주세요...</p>
    </div>
  );
}
