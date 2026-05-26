import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest } from '../api-client';
import { getApplicantProfileOverview } from '../applicant-profile-api';

vi.mock('../api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api-client')>()),
  apiRequest: vi.fn(),
}));

const applicantInfo = {
  ApplicantDTO: {
    photoUrl: null,
    name: '피우다',
    birthday: null,
    phoneNumber: '010-0000-0000',
    email: 'personal@gmail.com',
  },
  EducationDTO: [{ educationId: 1 }],
  AwardDTO: [],
  WorkExperienceDTO: [],
  CertificateDTO: [],
};

describe('applicant-profile-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/applicants') {
        return Promise.resolve({ status: 'OK', code: 200, data: applicantInfo, message: 'OK' });
      }

      if (path === '/essay-answers') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: { answerId: 1, answer: '자기소개서 답변' },
          message: 'OK',
        });
      }

      return Promise.resolve({
        status: 'OK',
        code: 200,
        data: { portfolioId: 1 },
        message: 'OK',
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('지원자 프로필 각 단계를 병렬 조회해 완성도를 반환한다', async () => {
    await expect(getApplicantProfileOverview()).resolves.toEqual({
      applicant: applicantInfo.ApplicantDTO,
      progress: {
        resume: true,
        'cover-letter': true,
        portfolio: true,
      },
    });

    expect(apiRequest).toHaveBeenCalledWith('/applicants');
    expect(apiRequest).toHaveBeenCalledWith('/essay-answers');
    expect(apiRequest).toHaveBeenCalledWith('/portfolios');
  });

  it('자기소개서와 포트폴리오가 없으면 미완료로 반환한다', async () => {
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/applicants') {
        return Promise.resolve({
          status: 'OK',
          code: 200,
          data: { ...applicantInfo, EducationDTO: [] },
          message: 'OK',
        });
      }

      return Promise.reject(new ApiError('missing profile section', 404));
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
