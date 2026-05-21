import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignupStore } from '@/store/signup-store';

import AccountPage from '../account/page';
import CompanyInfoPage from '../company-info/page';

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

async function completeCorporateAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('work@company.co.kr'), 'hr@company.co.kr');
  await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
  await user.type(screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'), 'Aa1!aa');
  await user.type(screen.getByPlaceholderText('회사명을 정확하게 입력해주세요.'), '피우다');
  await user.click(screen.getByRole('button', { name: '인증하기' }));
  await user.type(screen.getByPlaceholderText('숫자 6자리'), '123456');
  await user.click(screen.getByRole('button', { name: '확인' }));
}

async function completeCompanyInfo(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox'), '스타트업');
  await user.type(screen.getAllByPlaceholderText('숫자만 입력')[0], '15');
  await user.type(screen.getByPlaceholderText('영어, 한글 최대 10자 입력 가능'), '홍길동');
  await user.type(screen.getByPlaceholderText('e.g. 2003 (숫자만 입력)'), '2020');
  await user.type(screen.getByPlaceholderText('주소를 정확하게 입력해주세요.'), '서울시 강남구');
}

describe('기업 회원가입 플로우', () => {
  beforeEach(() => {
    navigationMock.params = { type: 'corporate' };
    navigationMock.push.mockClear();
    useSignupStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
  });

  it('기업 계정 화면은 회사명 필드를 렌더링하고 인증 전에는 다음 단계로 이동할 수 없다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);

    const nextButton = screen.getByRole('button', { name: /기업 정보 입력하기/ });
    expect(screen.getByText('1단계 : 계정 정보를 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('회사명을 입력해주세요.')).toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('work@company.co.kr'), 'hr@company.co.kr');
    await user.type(screen.getByPlaceholderText('영문, 숫자, 특수문자 조합 6-14자'), 'Aa1!aa');
    await user.type(
      screen.getByPlaceholderText('위에서 입력한 비밀번호를 입력해주세요.'),
      'Aa1!aa',
    );
    await user.type(screen.getByPlaceholderText('회사명을 정확하게 입력해주세요.'), '피우다');

    await waitFor(() => expect(nextButton).toBeDisabled());
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('기업 계정 인증과 유효한 입력 후 기업 정보 단계로 이동한다', async () => {
    const user = userEvent.setup();

    render(<AccountPage />);
    await completeCorporateAccount(user);

    const nextButton = screen.getByRole('button', { name: /기업 정보 입력하기/ });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    expect(navigationMock.push).toHaveBeenCalledWith('/signup/corporate/company-info');
    expect(useSignupStore.getState().account).toEqual({
      email: 'hr@company.co.kr',
      companyName: '피우다',
    });
  });

  it('기업 정보 필수값이 없으면 약관 단계로 이동할 수 없다', async () => {
    render(<CompanyInfoPage />);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    expect(
      screen.getByText('2단계 : 기본 정보 및 문화, 업무 방식에 대해서 작성해주세요.'),
    ).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
    expect(navigationMock.push).not.toHaveBeenCalled();
  });

  it('기업 정보 유효 입력 후 약관 단계로 이동하고 정보를 저장한다', async () => {
    const user = userEvent.setup();

    render(<CompanyInfoPage />);
    await completeCompanyInfo(user);

    const nextButton = screen.getByRole('button', { name: /다음 단계/ });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);

    expect(navigationMock.push).toHaveBeenCalledWith('/signup/corporate/terms');
    expect(useSignupStore.getState().companyInfo).toMatchObject({
      companyType: '스타트업',
      employeeCount: '15',
      ceoName: '홍길동',
      foundedYear: '2020',
      companyAddress: '서울시 강남구',
    });
  });
});
