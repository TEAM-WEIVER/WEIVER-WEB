import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export function changeMyPassword(payload: PasswordChangePayload) {
  return apiRequest<ApiResponse<null>>('/api/auth/applicants/me/password', {
    method: 'PATCH',
    body: payload,
  });
}

export function withdrawApplicant() {
  return apiRequest<ApiResponse<null>>('/api/auth/applicants/me', {
    method: 'DELETE',
  });
}
