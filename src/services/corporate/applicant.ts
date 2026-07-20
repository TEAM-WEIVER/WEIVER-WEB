import { apiRequest } from '@/lib/api-client';
import type { ApplicantListResponse, ApplicantDetail } from '@/schemas/corporate/applicant';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
}

export function getApplicants(
  jdId: number,
  params?: {
    keyword?: string;
    skillScoreMin?: number;
    cultureStyle?: string;
    techStacks?: string[];
    page?: number;
    size?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.skillScoreMin !== undefined) query.set('skillScoreMin', String(params.skillScoreMin));
  if (params?.cultureStyle) query.set('cultureStyle', params.cultureStyle);
  params?.techStacks?.forEach((stack) => query.append('techStacks', stack));
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.size !== undefined) query.set('size', String(params.size));
  const qs = query.toString();
  return apiRequest<ApiResponse<ApplicantListResponse>>(
    `/api/job-postings/${jdId}/applicants${qs ? `?${qs}` : ''}`,
  );
}

export function getApplicantDetail(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<ApplicantDetail>>(
    `/api/job-postings/${jdId}/applicants/${applicantPublicId}`,
  );
}

export function sendContactMail(jdId: number, applicantPublicId: string) {
  return apiRequest<ApiResponse<void>>(
    `/api/job-postings/${jdId}/applicants/${applicantPublicId}/mail`,
    { method: 'POST' },
  );
}
