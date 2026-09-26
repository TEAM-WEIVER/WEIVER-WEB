import { describe, expect, it } from 'vitest';

import type { JobPostingRequest, JobPostingResponse } from '@/schemas/corporate/job-posting';

import { toJobPostingFormValue, toUpdateFormData } from './job-posting-form.utils';

const request: JobPostingRequest = {
  title: '프론트엔드 개발자',
  deadline: '2026-12-31',
  jobCategory: '개발자',
  detailedJob: '프론트엔드 개발자',
  jobDescription: '웹 서비스를 개발합니다.',
  qualifications: 'React 경험',
  requirements: 'TypeScript 경험',
  preferredQualifications: 'Next.js 경험',
  competencyPriorities: ['문제해결력'],
  requiredTechs: ['React'],
  traitPriorities: ['자율·혁신'],
  emailTitle: '[WEIVER] 지원 결과 안내',
  emailContent: '지원해 주셔서 감사합니다.',
};

describe('job-posting form utilities', () => {
  it('수정 요청을 updateDTO application/json Blob으로 만든다', async () => {
    const formData = toUpdateFormData({ ...request, isEmailBannerDeleted: false });
    const updateDTO = formData.get('updateDTO');

    expect(updateDTO).toBeInstanceOf(Blob);
    expect((updateDTO as Blob).type).toBe('application/json');
    await expect((updateDTO as Blob).text()).resolves.toBe(
      JSON.stringify({ ...request, isEmailBannerDeleted: false }),
    );
    expect(formData.get('requestDTO')).toBeNull();
    expect(formData.get('emailBannerImage')).toBeNull();
  });

  it('누락된 선택 응답값을 빈 문자열과 빈 배열로 정규화한다', () => {
    const response = {
      jdId: 101,
      title: request.title,
      deadline: request.deadline,
      jobCategory: request.jobCategory,
      detailedJob: request.detailedJob,
      emailTitle: request.emailTitle,
      emailContent: request.emailContent,
    } as JobPostingResponse;

    expect(toJobPostingFormValue(response)).toMatchObject({
      ...request,
      jobDescription: '',
      qualifications: '',
      requirements: '',
      preferredQualifications: '',
      competencyPriorities: [],
      requiredTechs: [],
      traitPriorities: [],
    });
  });
});
