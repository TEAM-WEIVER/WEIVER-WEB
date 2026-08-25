import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEssayAnswers } from '@/lib/onboarding-api';

import CoverLetterPage from '../page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/onboarding-api', () => ({
  getEssayAnswers: vi.fn(),
  postEssayAnswers: vi.fn(),
  putEssayAnswers: vi.fn(),
}));

describe('자기소개서 온보딩 페이지', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.mocked(getEssayAnswers).mockResolvedValue({
      status: 'success',
      code: 200,
      data: { answers: [] },
      message: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('제출 클릭 후 글자 수 제한을 초과한 문항에 오류를 표시한다', async () => {
    const user = userEvent.setup();
    render(<CoverLetterPage />);

    const [firstQuestion] = await screen.findAllByPlaceholderText('내용을 입력해주세요.');
    await user.type(firstQuestion, '가'.repeat(1001));
    await user.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(screen.getByText('최대 1000자까지 입력해주세요.')).toBeInTheDocument();
    });
    expect(firstQuestion).toHaveAttribute('aria-invalid', 'true');
  });
});
