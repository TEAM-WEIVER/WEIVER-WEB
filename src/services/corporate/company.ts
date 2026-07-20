import { apiRequest } from '@/lib/api-client';
import type { CompanyDetail } from '@/schemas/corporate/company';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string | null;
}

export function getMyCompany() {
  return apiRequest<ApiResponse<CompanyDetail>>('/api/companies/me');
}
