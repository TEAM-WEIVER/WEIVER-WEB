import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { completeSignup } from '@/lib/signup-api';
import { useSignupStore } from '@/store/signup-store';

import TermsPage from '../terms/page';

const navigationMock = vi.hoisted(() => ({
  params: { type: 'corporate' },
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

describe('기업 회원가입 후 대시보드 연결', () => {
  beforeEach(() => {
    navigationMock.params = { type: 'corporate' };
    navigationMock.push.mockClear();
    vi.mocked(completeSignup).mockResolvedValue(undefined);
    useSignupStore.getState().reset();
    useSignupStore.getState().setAccount({ email: 'hr@company.co.kr', companyName: '피우다' });
    useSignupStore.getState().setCompanyInfo({
      companyType: '스타트업',
      employeeCount: '15',
      ceoName: '홍길동',
      foundedYear: '2020',
      companyAddress: '서울시 강남구',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('필수 약관 동의 후 기업 회원가입을 완료하고 기업 대시보드로 이동한다', async () => {
    const user = userEvent.setup();

    render(<TermsPage />);

    const submitButton = screen.getByRole('button', { name: '다음 단계' });
    expect(
      screen.getByText('3단계 : 정보 수집 및 이용에 대한 약관에 동의해주세요.'),
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
        type: 'corporate',
        account: { email: 'hr@company.co.kr', companyName: '피우다' },
        terms: {
          serviceTerms: true,
          privacyPolicy: true,
          corporateTerms: true,
          marketingConsent: false,
        },
        companyInfo: expect.objectContaining({
          companyType: '스타트업',
          employeeCount: '15',
          ceoName: '홍길동',
          foundedYear: '2020',
          companyAddress: '서울시 강남구',
        }),
      });
    });

    expect(navigationMock.push).toHaveBeenCalledWith('/corporate/dashboard');
  });
});
