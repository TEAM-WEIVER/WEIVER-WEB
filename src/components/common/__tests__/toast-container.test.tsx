import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toast, useToastStore } from '@/store/toast-store';

import { ToastContainer } from '../toast-container';

describe('ToastContainer', () => {
  afterEach(() => {
    cleanup();
    useToastStore.setState({ toasts: [] });
    vi.useRealTimers();
  });

  it.each([
    ['success', 'status', 'polite'],
    ['info', 'status', 'polite'],
    ['warning', 'alert', 'assertive'],
    ['error', 'alert', 'assertive'],
  ] as const)('%s 알림의 제목과 설명을 %s로 표시한다', (type, role, ariaLive) => {
    toast.add({ type, title: '알림 제목', description: '알림 설명' });
    render(<ToastContainer />);

    const notification = screen.getByRole(role);
    expect(notification).toHaveAttribute('aria-live', ariaLive);
    expect(within(notification).getByText('알림 제목')).toBeVisible();
    expect(within(notification).getByText('알림 설명')).toBeVisible();
  });

  it('설명이 없는 알림은 기본 3초가 지나면 사라진다', () => {
    vi.useFakeTimers();
    toast.add({ type: 'success', title: '완료했습니다' });
    render(<ToastContainer />);

    const notification = screen.getByRole('status');
    expect(notification).toHaveTextContent(/^완료했습니다$/);
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(notification).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('여러 알림을 표시하고 닫은 알림만 제거한다', () => {
    render(<ToastContainer />);
    act(() => {
      toast.add({ type: 'success', title: '첫 번째 알림' });
      toast.add({ type: 'error', title: '두 번째 알림' });
    });

    const first = screen.getByRole('status');
    const second = screen.getByRole('alert');
    expect(first).toHaveTextContent('첫 번째 알림');
    expect(second).toHaveTextContent('두 번째 알림');

    fireEvent.click(within(first).getByRole('button', { name: '알림 닫기' }));

    expect(first).not.toBeInTheDocument();
    expect(second).toBeVisible();
  });
});
