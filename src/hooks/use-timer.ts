import { useState, useEffect, useCallback } from 'react';

export function useTimer(initialSeconds: number) {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  const isRunning = endTime !== null && remaining > 0;

  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      const diff = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0) {
        setEndTime(null);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const start = useCallback(() => {
    setEndTime(Date.now() + initialSeconds * 1000);
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  const reset = useCallback(() => {
    setEndTime(null);
    setRemaining(0);
  }, []);

  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return { seconds: remaining, formatted, isRunning, start, reset };
}
