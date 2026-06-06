import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ApplicantMyPage from '../page';

vi.mock('@/lib/auth-api', () => ({
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe('ApplicantMyPage', () => {
  it('마이페이지 빈 상태와 로그아웃 버튼을 표시한다', () => {
    render(<ApplicantMyPage />);

    expect(screen.getByRole('heading', { name: '마이페이지' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });
});
