import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface CompanyLoginData {
  publicId?: string;
  role?: string;
}

export async function loginCompany(payload: LoginPayload) {
  return apiRequest<ApiResponse<CompanyLoginData>>('/api/auth/companies/login', {
    method: 'POST',
    body: payload,
  });
}
