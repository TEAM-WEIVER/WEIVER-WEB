import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logout } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';

import { LogoutButton } from '../logout-button';

const navigationMock = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: navigationMock.replace,
  }),
}));

vi.mock('@/lib/auth-api', () => ({
  logout: vi.fn(),
}));

describe('LogoutButton', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('로그아웃 후 로그인 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    vi.mocked(logout).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: 'OK',
      message: 'OK',
    });

    render(<LogoutButton className="flex" />);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
    expect(navigationMock.replace).toHaveBeenCalledWith('/login');
  });

  it('로그아웃 API가 실패해도 로그인 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    vi.mocked(logout).mockRejectedValue(new Error('logout failed'));

    render(<LogoutButton className="flex" />);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(navigationMock.replace).toHaveBeenCalledWith('/login');
    });
  });

  it('자식 버튼을 로그아웃 트리거로 사용할 수 있다', async () => {
    const user = userEvent.setup();
    vi.mocked(logout).mockResolvedValue({
      status: 'OK',
      code: 200,
      data: 'OK',
      message: 'OK',
    });

    render(
      <LogoutButton asChild>
        <Button type="button" variant="outline" size="xs">
          로그아웃
        </Button>
      </LogoutButton>,
    );

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });
});
