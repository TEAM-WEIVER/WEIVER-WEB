'use client';

import { useEffect } from 'react';

import { toast } from '@/store/toast-store';

declare global {
  interface Window {
    __toast?: typeof toast;
  }
}

/** Playwright에서만 토스트 facade를 호출할 수 있도록 연결합니다. */
export function ToastTestBridge() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_TEST !== 'true') {
      return;
    }

    window.__toast = toast;
  }, []);

  return null;
}
