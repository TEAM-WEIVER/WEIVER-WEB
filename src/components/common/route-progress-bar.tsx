'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useRouteLoadingStore } from '@/store/route-loading-store';

const THRESHOLD_MS = 200;
const FADE_MS = 100;

type BarStatus = 'hidden' | 'visible' | 'fading';

/**
 * 글로벌 라우트 전환 로딩 인디케이터.
 *
 * - router.push() 또는 Link onNavigate 호출 시 startNavigation()이 isPending=true로 설정
 * - 200ms 이상 전환이 지속되면 프로그레스 바 노출
 * - usePathname() 변경(URL commit) 시 completeNavigation()을 호출하여 바 소멸
 *
 * 상태 설계:
 * - fading 여부를 별도 boolean이 아닌 BarStatus 단일 상태로 관리
 * - effect 내부에서 setState를 동기 호출하지 않고 setTimeout 콜백(비동기)에서만 호출
 * - visibleRef로 최신 status 값을 추적하여 isPending effect의 stale closure 방지
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const isPending = useRouteLoadingStore((s) => s.isPending);
  const completeNavigation = useRouteLoadingStore((s) => s.completeNavigation);

  const [status, setStatus] = useState<BarStatus>('hidden');

  // ref로 status 최신값을 추적 — effect 의존성 추가 없이 stale closure 방지
  const statusRef = useRef<BarStatus>('hidden');

  const thresholdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathname = useRef(pathname);

  // statusRef를 effect 내에서 동기화
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // pathname 변경 감지 → 전환 완료 처리
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      completeNavigation();
    }
  }, [pathname, completeNavigation]);

  // isPending 변화에 따라 바 표시/소멸 처리
  useEffect(() => {
    if (isPending) {
      // 새 내비게이션 시작 — 진행 중인 모든 타이머 취소
      // fading 상태도 취소: fadeTimerRef 제거 후 hidden으로 되돌리는 타이머가 사라짐
      // status 동기 변경 없이, 진행 중인 타이머만 정리
      clearTimeout(thresholdTimerRef.current ?? undefined);
      clearTimeout(fadeTimerRef.current ?? undefined);
      thresholdTimerRef.current = null;
      fadeTimerRef.current = null;

      // 200ms 이후에도 isPending이면 바 노출 (비동기 setState)
      thresholdTimerRef.current = setTimeout(() => {
        setStatus('visible');
        thresholdTimerRef.current = null;
      }, THRESHOLD_MS);
    } else {
      // 전환 완료 — 200ms 타이머 취소
      clearTimeout(thresholdTimerRef.current ?? undefined);
      thresholdTimerRef.current = null;

      // statusRef로 최신 status 값을 읽어 stale closure 방지
      if (statusRef.current === 'visible' || statusRef.current === 'fading') {
        // 바가 이미 노출 중이면 페이드 아웃 (비동기 setState)
        fadeTimerRef.current = setTimeout(() => {
          setStatus('fading');
          fadeTimerRef.current = setTimeout(() => {
            setStatus('hidden');
            fadeTimerRef.current = null;
          }, FADE_MS);
        }, 0);
      }
    }

    // cleanup은 타이머 정리만 담당
    return () => {
      clearTimeout(thresholdTimerRef.current ?? undefined);
      clearTimeout(fadeTimerRef.current ?? undefined);
    };
  }, [isPending]);

  if (status === 'hidden') return null;

  return (
    <div
      role="progressbar"
      aria-label="페이지 전환 중"
      aria-live="polite"
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        width: '100%',
        zIndex: 9999,
        opacity: status === 'fading' ? 0 : 1,
        transition: status === 'fading' ? `opacity ${FADE_MS}ms ease` : undefined,
        pointerEvents: 'none',
      }}
    >
      <div
        className="bg-primary-700 h-1 w-full"
        style={{ animation: 'progress-indeterminate 1.5s ease-in-out infinite' }}
        aria-hidden
      />
    </div>
  );
}
