import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface ApplicantLoginPayload {
  email: string;
  password: string;
}

interface ApplicantLoginData {
  accessToken: string;
  role: 'APPLICANT';
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
