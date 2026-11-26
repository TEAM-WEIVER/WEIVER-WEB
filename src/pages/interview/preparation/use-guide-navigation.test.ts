import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuideNavigation } from './use-guide-navigation';

let reduced = false;
const events = new EventTarget();
beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('면접 준비 단계 전환', () => {
  it('퇴장·진입 중 중복 호출을 무시하고 다음·이전 방향을 보존한다', () => {
    const { result } = renderHook(() => useGuideNavigation(6));
    act(() => {
      result.current.moveTo(1);
      result.current.moveTo(2);
    });
    expect(result.current.step).toBe(0);
    expect(result.current.phase).toBe('out');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.step).toBe(1);
    expect(result.current.phase).toBe('in');
    act(() => result.current.moveTo(2));
    expect(result.current.step).toBe(1);
    act(() => vi.advanceTimersByTime(180));
    expect(result.current.transitioning).toBe(false);
    act(() => result.current.moveTo(0));
    expect(result.current.direction).toBe('previous');
    act(() => vi.advanceTimersByTime(280));
    expect(result.current.step).toBe(0);
  });
  it('모션 감소는 즉시 이동하고 전환 중 설정이 바뀌어도 목표 단계로 완료한다', () => {
    const { result } = renderHook(() => useGuideNavigation(6));
    act(() => result.current.moveTo(1));
    act(() => {
      reduced = true;
      events.dispatchEvent(new Event('change'));
    });
    expect(result.current.step).toBe(1);
    expect(result.current.phase).toBe('idle');
    act(() => result.current.moveTo(2));
    expect(result.current.step).toBe(2);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.step).toBe(2);
  });
  it('잘못된 단계는 무시하고 이탈하면 타이머를 정리한다', () => {
    const { result, unmount } = renderHook(() => useGuideNavigation(6));
    act(() => {
      result.current.moveTo(-1);
      result.current.moveTo(6);
    });
    expect(result.current.phase).toBe('idle');
    act(() => result.current.moveTo(1));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
