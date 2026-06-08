import { clearAccessToken, setAccessToken } from './auth-token';
import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

interface ReissueAccessTokenData {
  accessToken: string;
}

export async function reissueAccessToken() {
  const response = await apiRequest<ApiResponse<ReissueAccessTokenData>>('/api/auth/reissue', {
    method: 'POST',
    skipAuthorization: true,
    skipAuthRetry: true,
  });

  setAccessToken(response.data.accessToken);
  return response;
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
