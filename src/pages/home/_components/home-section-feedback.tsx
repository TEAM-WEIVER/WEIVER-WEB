import { Button } from '@/components/ui/button';

import type { HomeSectionState } from '../_types/home';

type HomeSectionFeedbackProps = {
  status: Extract<HomeSectionState<never>['status'], 'error' | 'unavailable'>;
  label: string;
  onRetry?: () => void;
};

export function HomeSectionFeedback({ status, label, onRetry }: HomeSectionFeedbackProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
      <p role={status === 'error' ? 'alert' : undefined} className="text-body2 text-text-tertiary">
        {status === 'error'
          ? `${label} 정보를 불러오지 못했어요.`
          : `${label} 기능을 준비 중이에요.`}
      </p>
      {status === 'error' ? (
        <Button
          type="button"
          variant="outline"
          className="h-9 text-sm"
          onClick={onRetry}
          disabled={!onRetry}
          aria-label={`${label} 다시 불러오기`}
        >
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
