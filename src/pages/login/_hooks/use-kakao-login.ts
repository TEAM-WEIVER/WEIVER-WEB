import { useEffect, useRef, useState } from 'react';

import { beginKakaoLogin, getKakaoErrorMessage } from '@/lib/kakao-auth-flow';

export function useKakaoLogin() {
  const starting = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      starting.current = false;
      setIsStarting(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const onStart = async () => {
    if (starting.current) return;
    starting.current = true;
    setIsStarting(true);
    setError(null);
    try {
      await beginKakaoLogin();
    } catch (cause) {
      starting.current = false;
      setIsStarting(false);
      setError(getKakaoErrorMessage(cause));
    }
  };

  return { onStart, isStarting, error };
}
