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

interface ApplicantLoginPayload {
  email: string;
  password: string;
}

interface CompanyLoginData {
  accessToken: string;
  role: 'COMPANY';
}

interface ApplicantLoginData {
  accessToken: string;
  role: 'APPLICANT';
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

export async function loginApplicant(payload: ApplicantLoginPayload) {
  return apiRequest<ApiResponse<ApplicantLoginData>>('/api/auth/applicants/login', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
    },
  });
}
