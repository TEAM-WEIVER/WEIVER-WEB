import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPortfolio, patchPortfolio, postPortfolio } from '@/lib/onboarding-api';

import PortfolioPage from '../page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/onboarding-api', () => ({
  getPortfolio: vi.fn(),
  patchPortfolio: vi.fn(),
  postPortfolio: vi.fn(),
}));

async function getRequestDTO(formData: FormData) {
  const requestDTO = formData.get('requestDTO');
  if (!(requestDTO instanceof Blob)) throw new Error('requestDTO Blob이 없습니다.');
  return JSON.parse(await requestDTO.text());
}

describe('포트폴리오 온보딩 페이지', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.mocked(getPortfolio).mockResolvedValue({
      status: 'success',
      code: 200,
      data: {
        portfolioId: null,
        downloadUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        urlGithub: null,
        urlTech: null,
        urlEtc: null,
      },
      message: null,
    });
    vi.mocked(postPortfolio).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
    vi.mocked(patchPortfolio).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('스켈레톤 분기', () => {
    it('isLoading=true 시 파일 업로드/외부 링크/동의 로딩 섹션을 렌더링한다', () => {
      vi.mocked(getPortfolio).mockImplementation(() => new Promise(() => {}));

      render(<PortfolioPage />);

      expect(screen.getByRole('region', { name: '파일 업로드 로딩 중' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '외부 링크 로딩 중' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: '동의 로딩 중' })).toBeInTheDocument();
    });

    it('isLoading=true 시 이전 단계/나중에 작성/제출 버튼이 모두 disabled이다', () => {
      vi.mocked(getPortfolio).mockImplementation(() => new Promise(() => {}));

      render(<PortfolioPage />);

      expect(screen.getByRole('button', { name: /이전 단계/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: '나중에 작성' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
    });
  });

  it('기존 포트폴리오가 없으면 파일과 requestDTO를 POST로 저장한다', async () => {
    const user = userEvent.setup();
    const { container } = render(<PortfolioPage />);

    await waitFor(() => {
      expect(getPortfolio).toHaveBeenCalled();
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['portfolio'], 'portfolio.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, file);
    await user.type(
      screen.getByPlaceholderText('https://github.com/username'),
      'https://github.com/weiver-dev',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '제출' }));

    await waitFor(() => {
      expect(postPortfolio).toHaveBeenCalled();
    });
    const formData = vi.mocked(postPortfolio).mock.calls[0][0];
    await expect(getRequestDTO(formData)).resolves.toEqual({
      urlGithub: 'https://github.com/weiver-dev',
      urlTech: null,
      urlEtc: null,
    });
    expect(formData.get('portfolio')).toBe(file);
    expect(patchPortfolio).not.toHaveBeenCalled();
  });

  it('제출 클릭 후 포트폴리오 파일 또는 링크 누락 오류를 업로드 영역에 표시한다', async () => {
    const user = userEvent.setup();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(getPortfolio).toHaveBeenCalled();
    });
    await user.click(screen.getByRole('button', { name: '제출' }));

    expect(
      await screen.findByText('포트폴리오 파일 또는 링크를 하나 이상 입력해주세요.'),
    ).toBeInTheDocument();
    expect(postPortfolio).not.toHaveBeenCalled();
  });

  it('제출 클릭 후 잘못된 링크 형식에 오류를 표시한다', async () => {
    const user = userEvent.setup();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(getPortfolio).toHaveBeenCalled();
    });
    const githubInput = screen.getByPlaceholderText('https://github.com/username');
    await user.type(githubInput, 'github.com/weiver-dev');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '제출' }));

    expect(await screen.findByText('올바른 URL 형식을 입력해주세요.')).toBeInTheDocument();
    expect(githubInput).toHaveAttribute('aria-invalid', 'true');
    expect(postPortfolio).not.toHaveBeenCalled();
  });

  it('기존 포트폴리오가 있으면 새 파일 없이 requestDTO만 PATCH로 수정한다', async () => {
    const user = userEvent.setup();
    vi.mocked(getPortfolio).mockResolvedValueOnce({
      status: 'success',
      code: 200,
      data: {
        portfolioId: 1,
        downloadUrl: 'https://example.com/portfolio.pdf',
        fileName: 'portfolio.pdf',
        fileType: 'PDF',
        fileSize: 1024000,
        urlGithub: 'https://github.com/example',
        urlTech: 'https://velog.io/@example',
        urlEtc: null,
      },
      message: null,
    });
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://github.com/username')).toHaveValue(
        'https://github.com/example',
      );
    });
    expect(screen.getByText('portfolio.pdf')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '다운로드' })).toHaveAttribute(
      'href',
      'https://example.com/portfolio.pdf',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '제출' }));

    await waitFor(() => {
      expect(patchPortfolio).toHaveBeenCalled();
    });
    const [portfolioId, formData] = vi.mocked(patchPortfolio).mock.calls[0];
    expect(portfolioId).toBe(1);
    await expect(getRequestDTO(formData)).resolves.toEqual({
      urlGithub: 'https://github.com/example',
      urlTech: 'https://velog.io/@example',
      urlEtc: null,
    });
    expect(formData.has('portfolio')).toBe(false);
    expect(postPortfolio).not.toHaveBeenCalled();
  });
});
