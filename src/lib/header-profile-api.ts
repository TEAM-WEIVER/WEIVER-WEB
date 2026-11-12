import { apiRequest } from './api-client';

export async function getHeaderProfileName() {
  const response = await apiRequest<{
    data: { ApplicantDTO: { name?: string | null } | null };
  }>('/api/applicants');

  return response.data.ApplicantDTO?.name?.trim() ?? '';
}
