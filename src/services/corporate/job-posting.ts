import { apiRequest } from '@/lib/api-client';
import type { JobPostingResponse } from '@/schemas/corporate/job-posting';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
}

export function createJobPosting(data: FormData, isTemp?: boolean) {
  const qs = isTemp !== undefined ? `?isTemp=${isTemp}` : '';
  return apiRequest<ApiResponse<void>>(`/api/job-postings${qs}`, {
    method: 'POST',
    body: data,
  });
}

export function getJobPosting(jdId: number) {
  return apiRequest<ApiResponse<JobPostingResponse>>(`/api/job-postings/${jdId}`);
}

export function updateJobPosting(jdId: number, data: FormData) {
  return apiRequest<ApiResponse<void>>(`/api/job-postings/${jdId}`, {
    method: 'PUT',
    body: data,
  });
}

export function deleteJobPosting(jdId: number) {
  return apiRequest<ApiResponse<void>>(`/api/job-postings/${jdId}`, {
    method: 'DELETE',
  });
}
