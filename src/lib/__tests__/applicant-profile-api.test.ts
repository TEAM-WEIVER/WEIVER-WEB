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

      return Promise.reject(new Error(`unexpected request: ${path}`));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('지원자 제출 서류 작성 상태를 단일 API로 조회해 완성도를 반환한다', async () => {
    await expect(getApplicantProfileOverview()).resolves.toEqual({
      progress: {
        resume: true,
        'cover-letter': true,
        portfolio: true,
      },
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/document-status');
  });

  it('제출 서류가 미완료이면 미완료로 반환한다', async () => {
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

      return Promise.reject(new Error(`unexpected request: ${path}`));
    });

    await expect(getApplicantProfileOverview()).resolves.toMatchObject({
      progress: {
        resume: false,
        'cover-letter': false,
        portfolio: false,
      },
    });
  });
});
