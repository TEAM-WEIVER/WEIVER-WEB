import { useId } from 'react';
import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function KakaoLogin() {
  const descriptionId = useId();

  return (
    <div>
      <div className="text-caption text-text-tertiary before:bg-border-default after:bg-border-default my-6 flex items-center gap-3 before:h-px before:flex-1 after:h-px after:flex-1 sm:my-8">
        또는
      </div>
      <Button
        type="button"
        className="w-full disabled:bg-[#fee500] disabled:text-black"
        aria-describedby={descriptionId}
        disabled
      >
        <MessageCircle aria-hidden="true" className="fill-current" />
        카카오로 시작하기
      </Button>
      <span id={descriptionId} className="sr-only">
        카카오 로그인 연동 준비 중입니다.
      </span>
    </div>
  );
}
