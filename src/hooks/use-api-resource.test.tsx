import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useApiResource } from './use-api-resource';

describe('useApiResource', () => {
  it('조회 실패 후 재시도한 응답을 표시한다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce('saved');
    const { result } = renderHook(() => useApiResource(load));
    await waitFor(() => expect(result.current.state.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: 'saved' }));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('이전 조회를 취소하고 늦게 도착한 이전 응답을 무시한다', async () => {
    let finishOld!: (data: string) => void;
    let oldSignal: AbortSignal | undefined;
    const oldLoad = (signal?: AbortSignal) => {
      oldSignal = signal;
      return new Promise<string>((resolve) => {
        finishOld = resolve;
      });
    };
    const newLoad = async () => 'latest';
    const { result, rerender, unmount } = renderHook(({ load }) => useApiResource(load), {
      initialProps: { load: oldLoad },
    });
    rerender({ load: newLoad });
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', data: 'latest' }));
    expect(oldSignal?.aborted).toBe(true);
    await act(async () => {
      finishOld('old');
    });
    expect(result.current.state).toEqual({ status: 'ready', data: 'latest' });
    unmount();
  });
});
