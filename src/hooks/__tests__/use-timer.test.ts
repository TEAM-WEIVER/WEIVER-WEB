import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimer } from '../use-timer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('초기 상태에서 isRunning은 false이고 isExpired는 false이다', () => {
    const { result } = renderHook(() => useTimer(300));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.seconds).toBe(0);
  });

  it('start() 호출 후 isRunning이 true가 된다', () => {
    const { result } = renderHook(() => useTimer(300));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.isExpired).toBe(false);
  });

  it('reset() 호출 시 타이머가 초기화된다', () => {
    const { result } = renderHook(() => useTimer(300));

    act(() => {
      result.current.start();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.seconds).toBe(0);
  });

  it('타이머가 0에 도달하면 isExpired가 true가 되고 endTime이 null이 된다', async () => {
    const { result } = renderHook(() => useTimer(2));

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.seconds).toBe(0);
  });

  it('formatted는 MM:SS 형식으로 반환된다', () => {
    const { result } = renderHook(() => useTimer(300));

    act(() => {
      result.current.start();
    });

    expect(result.current.formatted).toMatch(/^\d{2}:\d{2}$/);
  });
});
