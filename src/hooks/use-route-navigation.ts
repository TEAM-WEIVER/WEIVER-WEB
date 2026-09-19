'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useRouteLoadingStore } from '@/store/route-loading-store';

/**
 * router.push()를 호출하면서 Zustand 단일 소스(isPending)로 라우트 전환 상태를 관리한다.
 *
 * useTransition의 isPending은 사용하지 않는다 — Zustand isPending과 이중 상태 불일치 방지.
 * 200ms 임계값: setTimeout으로 지연 후 바 노출.
 * pathname 변경(usePathname) 시점에 RouteProgressBar가 isPending을 감지하여 소멸한다.
 */
export function useRouteNavigation() {
  const router = useRouter();
  const { startNavigation } = useRouteLoadingStore();

  const push = useCallback(
    (href: string) => {
      startNavigation();
      router.push(href);
    },
    [router, startNavigation],
  );

  return { push };
}
