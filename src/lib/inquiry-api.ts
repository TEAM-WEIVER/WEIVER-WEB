import { apiRequest } from './api-client';

interface ApiResponse<TData> {
  status: string;
  code: number;
  data: TData;
  message: string;
}

export interface CreateInquiryPayload {
  title: string;
  content: string;
}

export function createInquiry(payload: CreateInquiryPayload) {
  return apiRequest<ApiResponse<null>>('/api/inquiries', {
    method: 'POST',
    body: payload,
  });
}
