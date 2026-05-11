import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { completeSignup } from '@/lib/signup-api';
import { useSignupStore } from '@/store/signup-store';

import TermsPage from '../terms/page';

const navigationMock = vi.hoisted(() => ({
  params: { type: 'individual' },
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => navigationMock.params,
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/signup-api', () => ({
  completeSignup: vi.fn(),
}));

describe('개인 회원가입 후 이력서 작성 연결', () => {
  beforeEach(() => {
    navigationMock.params = { type: 'individual' };
    navigationMock.push.mockClear();
    vi.mocked(completeSignup).mockResolvedValue(undefined);
    useSignupStore.getState().reset();
    useSignupStore.getState().setAccount({ email: 'user@example.com' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('필수 약관 동의 후 회원가입을 완료하고 이력서 작성으로 이동한다', async () => {
    const user = userEvent.setup();

    render(<TermsPage />);

    const submitButton = screen.getByRole('button', { name: '다음 단계' });
    expect(
      screen.getByText('2단계 : 정보 수집 및 이용에 대한 약관에 동의해주세요.'),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);

    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    await waitFor(() => {
      expect(completeSignup).toHaveBeenCalledWith({
        type: 'individual',
        account: { email: 'user@example.com', companyName: '' },
        terms: {
          serviceTerms: true,
          privacyPolicy: true,
          individualTerms: true,
          marketingConsent: false,
        },
        companyInfo: undefined,
      });
    });

    expect(useSignupStore.getState().terms).toEqual({
      serviceTerms: true,
      privacyPolicy: true,
      individualTerms: true,
      marketingConsent: false,
    });
    expect(navigationMock.push).toHaveBeenCalledWith('/onboarding/resume');
  });
});
