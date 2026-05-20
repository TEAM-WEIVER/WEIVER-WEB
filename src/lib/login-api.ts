import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface CompanyLoginPayload {
  id: string;
  password: string;
}

interface CompanyLoginData {
  accessToken: string;
  role: 'COMPANY';
}

export async function loginCompany(payload: CompanyLoginPayload) {
  return apiRequest<ApiResponse<CompanyLoginData>>('/api/auth/companies/login', {
    method: 'POST',
    body: {
      id: payload.id,
      password: payload.password,
    },
  });
}
