import { useEffect, useState } from 'react';

import { getHeaderProfileName } from '@/lib/header-profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { HeaderProfileButton } from './header-profile-button';

type ApplicantHeaderProfileProps = {
  /** Storybook 등에서도 실제 API 없이 동일한 상태 흐름을 확인할 수 있다. */
  loadName?: () => Promise<string>;
  onClick?: () => void;
  /** 조회한 이름을 본문에서도 사용할 때 중복 요청을 피한다. */
  onNameLoaded?: (name: string) => void;
};

export function ApplicantHeaderProfile({
  loadName = getHeaderProfileName,
  onClick,
  onNameLoaded,
}: ApplicantHeaderProfileProps) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'ready'; name: string }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void loadName().then(
      (name) => {
        if (!cancelled) {
          setState({ status: 'ready', name });
          onNameLoaded?.(name);
        }
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [loadName, attempt, onNameLoaded]);

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="프로필 불러오는 중" className="flex h-11 items-center gap-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          setState({ status: 'loading' });
          setAttempt((value) => value + 1);
        }}
      >
        프로필 다시 불러오기
      </Button>
    );
  }

  return <HeaderProfileButton fullName={state.name} onClick={onClick} />;
}
