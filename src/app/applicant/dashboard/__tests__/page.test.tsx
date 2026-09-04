import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApplicantProfileOverview } from '@/lib/applicant-profile-api';

import ApplicantDashboardPage from '../page';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMock.push,
  }),
}));

vi.mock('@/lib/applicant-profile-api', () => ({
  getApplicantProfileOverview: vi.fn(),
}));

vi.mock('../_components/profile-overview-card', () => ({
  ProfileOverviewCard: () => <div data-testid="profile-overview-card" />,
}));

vi.mock('../_components/hiring-process-card', () => ({
  HiringProcessCard: () => <div data-testid="hiring-process-card" />,
}));

vi.mock('../_components/interview-callout', () => ({
  InterviewCallout: () => <div data-testid="interview-callout" />,
}));

vi.mock('../_components/reapply-notice', () => ({
  ReapplyNotice: () => <div data-testid="reapply-notice" />,
}));

describe('지원자 대시보드 페이지 — 스켈레톤 분기', () => {
  beforeEach(() => {
    navigationMock.push.mockClear();
    vi.mocked(getApplicantProfileOverview).mockResolvedValue({
      applicant: {
        photoUrl: null,
        name: '김민채',
        birthday: '2001-07-30',
        phoneNumber: '010-8975-1978',
        email: 'rlawlsdl0730@gmail.com',
      },
      progress: {
        resume: true,
        'cover-letter': true,
        portfolio: true,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('isLoading=true 시 프로필/채용 절차/면접 스켈레톤 섹션을 렌더링한다', () => {
    // API 응답을 보류시켜 로딩 상태 유지
    vi.mocked(getApplicantProfileOverview).mockImplementation(() => new Promise(() => {}));

    render(<ApplicantDashboardPage />);

    expect(screen.getByRole('region', { name: '프로필 로딩 중' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '채용 절차 로딩 중' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '면접 로딩 중' })).toBeInTheDocument();
  });

  it('isLoading=false 시 스켈레톤이 없고 실제 컴포넌트를 렌더링한다', async () => {
    render(<ApplicantDashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-card')).toBeInTheDocument();
    });

    expect(screen.queryByRole('region', { name: '프로필 로딩 중' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '채용 절차 로딩 중' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '면접 로딩 중' })).not.toBeInTheDocument();
    expect(screen.getByTestId('hiring-process-card')).toBeInTheDocument();
    expect(screen.getByTestId('interview-callout')).toBeInTheDocument();
  });

  it('API 오류 시 에러 메시지를 표시한다', async () => {
    vi.mocked(getApplicantProfileOverview).mockRejectedValue(new Error('Network error'));

    render(<ApplicantDashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
      ).toBeInTheDocument();
    });
  });
});
