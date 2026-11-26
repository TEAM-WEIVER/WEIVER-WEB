import { useCallback, useEffect, useRef, useState } from 'react';

export function useGuideNavigation(stepCount: number) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [direction, setDirection] = useState<'next' | 'previous'>('next');
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const busy = useRef(false);
  const target = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media?.matches ?? false);
    update();
    media?.addEventListener('change', update);
    return () => media?.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!reduced || target.current === null) return;
    if (timer.current) clearTimeout(timer.current);
    setStep(target.current);
    target.current = null;
    busy.current = false;
    setPhase('idle');
  }, [reduced]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const moveTo = useCallback(
    (next: number) => {
      if (busy.current || next === step || next < 0 || next >= stepCount) return;
      setDirection(next < step ? 'previous' : 'next');
      if (reduced) {
        setStep(next);
        return;
      }
      busy.current = true;
      target.current = next;
      setPhase('out');
      timer.current = setTimeout(() => {
        setStep(next);
        setPhase('in');
        timer.current = setTimeout(() => {
          timer.current = null;
          target.current = null;
          busy.current = false;
          setPhase('idle');
        }, 180);
      }, 100);
    },
    [reduced, step, stepCount],
  );

  return { step, phase, direction, reduced, moveTo, transitioning: phase !== 'idle' };
}
