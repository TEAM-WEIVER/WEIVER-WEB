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
