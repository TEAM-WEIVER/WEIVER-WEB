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

interface PasswordResetPayload {
  email: string;
  verificationToken: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export function sendPasswordResetCode(email: string) {
  return apiRequest<ApiResponse<null>>('/api/auth/applicants/password/email/send', {
    method: 'POST',
    body: { email },
  });
}

export function verifyPasswordResetCode(email: string, code: string) {
  return apiRequest<ApiResponse<{ verificationToken: string }>>(
    '/api/auth/applicants/password/email/verify',
    { method: 'POST', body: { email, code } },
  );
}

export function resetPassword(payload: PasswordResetPayload) {
  return apiRequest<ApiResponse<null>>('/api/auth/applicants/password', {
    method: 'PATCH',
    body: payload,
  });
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
