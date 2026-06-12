import { clearAccessToken } from './auth-token';
import { apiRequest, reissueAccessTokenWithRefreshCookie } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export async function reissueAccessToken() {
  return reissueAccessTokenWithRefreshCookie();
}

export async function logout() {
  try {
    return await apiRequest<ApiResponse<string>>('/api/auth/logout', {
      method: 'POST',
    });
  } finally {
    clearAccessToken();
  }
}
