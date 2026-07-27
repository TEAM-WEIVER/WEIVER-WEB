import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import { getApplicantProfileOverview } from '../applicant-profile-api';

vi.mock('../api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api-client')>()),
  apiRequest: vi.fn(),
}));

describe('applicant-profile-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/api/applicants/document-status') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: {
            resumeCompleted: true,
            essayCompleted: true,
            portfolioCompleted: true,
          },
          message: 'OK',
        });
      }

      if (path === '/api/applicants') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: {
            ApplicantDTO: {
              photoUrl: 'https://example.com/profile.png',
              name: '김피우',
              birthday: '1999-01-01',
              phoneNumber: '010-1234-5678',
              email: 'applicant@example.com',
              address: '서울시 강남구',
            },
          },
          message: 'OK',
        });
      }

      return Promise.reject(new Error(`unexpected request: ${path}`));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('지원자 정보와 제출 서류 작성 상태를 조회해 프로필 개요를 반환한다', async () => {
    await expect(getApplicantProfileOverview()).resolves.toEqual({
      applicant: {
        photoUrl: 'https://example.com/profile.png',
        name: '김피우',
        birthday: '1999-01-01',
        phoneNumber: '010-1234-5678',
        email: 'applicant@example.com',
      },
      progress: {
        resume: true,
        'cover-letter': true,
        portfolio: true,
      },
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/document-status');
    expect(apiRequest).toHaveBeenCalledWith('/api/applicants');
  });

  it('지원자 전화번호가 없고 제출 서류가 미완료이면 그대로 반환한다', async () => {
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/api/applicants/document-status') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: {
            resumeCompleted: false,
            essayCompleted: false,
            portfolioCompleted: false,
          },
          message: 'OK',
        });
      }

      if (path === '/api/applicants') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: {
            ApplicantDTO: {
              photoUrl: null,
              name: '김피우',
              birthday: null,
              phoneNumber: null,
              email: 'applicant@example.com',
              address: null,
            },
          },
          message: 'OK',
        });
      }

      return Promise.reject(new Error(`unexpected request: ${path}`));
    });

    await expect(getApplicantProfileOverview()).resolves.toEqual({
      applicant: {
        photoUrl: null,
        name: '김피우',
        birthday: null,
        phoneNumber: null,
        email: 'applicant@example.com',
      },
      progress: {
        resume: false,
        'cover-letter': false,
        portfolio: false,
      },
    });
  });
});
