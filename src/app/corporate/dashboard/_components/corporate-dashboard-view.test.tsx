import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCompanyDashboard,
  useDashboardJobPostings,
  useNotifications,
  useReadNotification,
} from '@/hooks/corporate/use-dashboard';
import { useMyCompany } from '@/hooks/corporate/use-company';

import { CorporateDashboardView } from './corporate-dashboard-view';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/corporate/use-dashboard', () => ({
  useCompanyDashboard: vi.fn(),
  useDashboardJobPostings: vi.fn(),
  useNotifications: vi.fn(),
  useReadNotification: vi.fn(),
}));

vi.mock('@/hooks/corporate/use-company', () => ({
  useMyCompany: vi.fn(),
}));

vi.mock('./company-summary-card', () => ({
  CompanySummaryCard: () => <div data-testid="company-summary-card" />,
}));

vi.mock('./matching-notification-card', () => ({
  MatchingNotificationCard: () => <div data-testid="matching-notification-card" />,
}));

const defaultCompanyDashboard = {
  data: null,
  isLoading: false,
  error: null,
};

const defaultMyCompany = {
  data: null,
  isLoading: false,
  error: null,
};

const defaultNotifications = {
  data: null,
  isLoading: false,
  error: null,
};

const defaultReadNotification = {
  mutate: vi.fn(),
};

const defaultJobPostings = {
  data: null,
  isLoading: false,
  error: null,
};

describe('CorporateDashboardView — 스켈레톤 분기', () => {
  beforeEach(() => {
    vi.mocked(useCompanyDashboard).mockReturnValue(defaultCompanyDashboard);
    vi.mocked(useMyCompany).mockReturnValue(defaultMyCompany);
    vi.mocked(useNotifications).mockReturnValue(defaultNotifications);
    vi.mocked(useReadNotification).mockReturnValue(defaultReadNotification);
    vi.mocked(useDashboardJobPostings).mockReturnValue(defaultJobPostings);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('jobPostings.isLoading=true 시 채용공고 로딩 섹션을 렌더링한다', () => {
    vi.mocked(useDashboardJobPostings).mockReturnValue({
      ...defaultJobPostings,
      isLoading: true,
    });

    render(<CorporateDashboardView />);

    expect(screen.getByRole('region', { name: '채용공고 로딩 중' })).toBeInTheDocument();
  });

  it('jobPostings.isLoading=false이고 데이터가 있을 때 JobPostingList를 렌더링한다', async () => {
    vi.mocked(useDashboardJobPostings).mockReturnValue({
      data: {
        content: [
          {
            jdId: 1,
            title: '프론트엔드 개발자',
            status: 'ACTIVE',
            jobCategory: '개발',
            detailedJob: '웹 프론트엔드',
            newApplicantCount: 3,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<CorporateDashboardView />);

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: '채용공고 로딩 중' })).not.toBeInTheDocument();
    });

    expect(screen.getByText('프론트엔드 개발자')).toBeInTheDocument();
  });
});
