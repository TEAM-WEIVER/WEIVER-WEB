import { useId } from 'react';
import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface KakaoLoginProps {
  onStart: () => void | Promise<void>;
  isStarting: boolean;
  error: string | null;
  disabled?: boolean;
}

export function KakaoLogin({ onStart, isStarting, error, disabled }: KakaoLoginProps) {
  const descriptionId = useId();

  return (
    <div>
      <div className="text-caption text-text-tertiary before:bg-border-default after:bg-border-default my-6 flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1 sm:my-8">
        또는
      </div>
      <Button
        type="button"
        className="w-full bg-[#fee500] text-black hover:bg-[#fada0a] disabled:bg-[#fee500] disabled:text-black"
        aria-describedby={error ? descriptionId : undefined}
        disabled={disabled || isStarting}
        isLoading={isStarting}
        onClick={() => void onStart()}
      >
        <MessageCircle aria-hidden="true" className="fill-current" />
        {isStarting ? '카카오로 이동 중' : '카카오로 시작하기'}
      </Button>
      {error ? (
        <p id={descriptionId} role="alert" className="text-caption text-error mt-3">
          {error}
        </p>
      ) : null}
    </div>
  );
}
