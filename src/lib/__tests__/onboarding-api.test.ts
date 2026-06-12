import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../api-client';
import {
  postAwards,
  postCertificates,
  postEducations,
  postExperiences,
  putAwards,
  putCertificates,
  putEducations,
  putExperiences,
} from '../onboarding-api';

vi.mock('../api-client', () => ({
  apiRequest: vi.fn(),
}));

describe('onboarding-api', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockResolvedValue({
      status: 'success',
      code: 200,
      data: 'OK',
      message: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('경력 최초 저장은 WorkExperienceDTO 배열로 POST 요청을 보낸다', async () => {
    const workExperiences = [
      {
        companyName: '쿠팡플레이',
        startDate: '2019-03-01',
        endDate: '2024-08-01',
        employmentType: 'FULL_TIME',
        position: '대리',
        duties: '백엔드 개발',
        isRecognized: true,
      },
      {
        companyName: '토스',
        startDate: '2025-01-01',
        endDate: '2025-06-01',
        employmentType: 'INTERN',
        position: '인턴',
        duties: '프론트엔드 개발',
        isRecognized: false,
      },
    ];

    await postExperiences(workExperiences);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/experience', {
      method: 'POST',
      body: { WorkExperienceDTO: workExperiences },
    });
  });

  it('경력 수정은 WorkExperienceUpdateDTO 배열로 PUT 요청을 보낸다', async () => {
    const workExperiences = [
      {
        workExperienceId: 1,
        companyName: '쿠팡플레이',
        startDate: '2019-03-01',
        endDate: '2024-08-01',
        employmentType: 'FULL_TIME',
        position: '대리',
        duties: '백엔드 개발',
        isRecognized: true,
      },
      {
        companyName: '새 회사',
        startDate: '2025-01-01',
        endDate: '2025-06-01',
        employmentType: 'CONTRACT',
        position: '계약직',
        duties: '서비스 개발',
        isRecognized: false,
      },
    ];

    await putExperiences(workExperiences);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/experience', {
      method: 'PUT',
      body: { WorkExperienceUpdateDTO: workExperiences },
    });
  });

  it('자격증 최초 저장은 CertificateDTO 배열로 POST 요청을 보낸다', async () => {
    const certificates = [
      {
        acquisitionDate: '2000-01-01',
        certificateName: 'SQLD',
        issuer: '한국데이터산업진흥원',
      },
      {
        acquisitionDate: '2025-11-25',
        certificateName: 'ADsP',
        issuer: '한국데이터산업진흥원',
      },
    ];

    await postCertificates(certificates);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/certificate', {
      method: 'POST',
      body: { CertificateDTO: certificates },
    });
  });

  it('자격증 수정은 CertificateUpdateDTO 배열로 PUT 요청을 보낸다', async () => {
    const certificates = [
      {
        certificateId: 1,
        acquisitionDate: '2025-11-25',
        certificateName: 'SQLD',
        issuer: '한국데이터산업진흥원',
      },
      {
        acquisitionDate: '2026-01-01',
        certificateName: '정보처리기사',
        issuer: '한국산업인력공단',
      },
    ];

    await putCertificates(certificates);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/certificate', {
      method: 'PUT',
      body: { CertificateUpdateDTO: certificates },
    });
  });

  it('학력 최초 저장은 EducationDTO 배열로 POST 요청을 보낸다', async () => {
    const educations = [
      {
        degreeType: 'ASSOCIATE',
        schoolName: '한양대학교',
        major: '컴퓨터학부',
        gpa: 4.1,
        startDate: '2021-03',
        endDate: '2027-03',
        status: 'ACTIVE',
      },
    ];

    await postEducations(educations);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/education', {
      method: 'POST',
      body: { EducationDTO: educations },
    });
  });

  it('학력 수정은 EducationUpdateDTO 배열로 PUT 요청을 보낸다', async () => {
    const educations = [
      {
        educationId: 1,
        degreeType: 'ASSOCIATE',
        schoolName: '한양대학교',
        major: '컴퓨터학부',
        gpa: 4.1,
        startDate: '2021-03',
        endDate: '2027-03',
        status: 'ACTIVE',
      },
    ];

    await putEducations(educations);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/education', {
      method: 'PUT',
      body: { EducationUpdateDTO: educations },
    });
  });

  it('수상이력 최초 저장은 AwardDTO 배열로 POST 요청을 보낸다', async () => {
    const awards = [
      {
        awardDate: '2000-01-01',
        awardName: '최우수상',
        issuer: '한국인터넷진흥원장',
      },
    ];

    await postAwards(awards);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/award', {
      method: 'POST',
      body: { AwardDTO: awards },
    });
  });

  it('수상이력 수정은 AwardUpdateDTO 배열로 PUT 요청을 보낸다', async () => {
    const awards = [
      {
        awardId: 1,
        awardDate: '2025-11-25',
        awardName: '소개딩 최우수상',
        issuer: '한국인터넷진흥원',
      },
    ];

    await putAwards(awards);

    expect(apiRequest).toHaveBeenCalledWith('/api/applicants/award', {
      method: 'PUT',
      body: { AwardUpdateDTO: awards },
    });
  });

});
