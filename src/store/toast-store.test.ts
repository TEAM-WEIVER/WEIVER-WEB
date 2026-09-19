import { afterEach, describe, expect, it, vi } from 'vitest';

import { toast, useToastStore } from './toast-store';

describe('toast facade', () => {
  afterEach(() => {
    useToastStore.getState().toasts.forEach(({ id }) => useToastStore.getState().remove(id));
    vi.restoreAllMocks();
  });

  it('스토어에 토스트를 추가한다', () => {
    toast.add({ type: 'success', title: '저장되었습니다' });

    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ type: 'success', title: '저장되었습니다' }),
    ]);
  });

  it('스토어 접근 실패 시 예외를 전파하지 않고 경고한다', () => {
    const getState = vi.spyOn(useToastStore, 'getState').mockImplementationOnce(() => {
      throw new Error('store unavailable');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => toast.add({ type: 'error', title: '오류' })).not.toThrow();
    expect(getState).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('토스트를 표시하지 못했습니다.', expect.any(Error));
  });
});
